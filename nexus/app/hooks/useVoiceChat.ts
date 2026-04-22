// app/hooks/useVoiceChat.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    useBroadcastEvent,
    useEventListener,
    useSelf,
} from "@liveblocks/react/suspense";

export type VoiceParticipant = {
    userId: string;
    userName: string;
    userColor: string;
    userImage: string;
    isMuted: boolean;
    isSpeaking: boolean;
};

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
];

export function useVoiceChat() {
    const self = useSelf();
    const broadcast = useBroadcastEvent();

    const [isInVoice, setIsInVoice] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [error, setError] = useState<string | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);
    const isMutedRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const isInVoiceRef = useRef(false);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const negotiatingRef = useRef<Set<string>>(new Set());
    const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const peerStreamIdRef = useRef<Map<string, string>>(new Map());
    const audioContainerRef = useRef<HTMLDivElement | null>(null);
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Speaking detection via getStats — NO AudioContext created
    // AudioContext interferes with Chrome's AEC reference tracking
    const speakingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // We need at least one sender to poll stats — store a reference
    const localSenderRef = useRef<RTCRtpSender | null>(null);

    // ── Audio container — off-screen, NOT visibility:hidden ────
    useEffect(() => {
        const div = document.createElement("div");
        div.style.cssText =
            "position:fixed;left:-9999px;top:-9999px;" +
            "width:1px;height:1px;pointer-events:none;";
        div.setAttribute("aria-hidden", "true");
        document.body.appendChild(div);
        audioContainerRef.current = div;
        return () => { div.remove(); };
    }, []);

    // ─────────────────────────────────────────────────────
    // Speaking detection using RTCRtpSender.getStats()
    // This reads the audio input level directly from the
    // RTP pipeline — no AudioContext, no interference with AEC
    // ─────────────────────────────────────────────────────
    const startSpeakingDetection = useCallback(() => {
        if (speakingPollRef.current) clearInterval(speakingPollRef.current);

        speakingPollRef.current = setInterval(async () => {
            if (!self || !localSenderRef.current) return;

            try {
                const stats = await localSenderRef.current.getStats();
                let inputLevel = 0;

                stats.forEach((report) => {
                    // "media-source" report contains audioLevel for the local mic
                    if (report.type === "media-source" && report.kind === "audio") {
                        inputLevel = report.audioLevel ?? 0;
                    }
                });

                // audioLevel is 0.0–1.0 (linear, not dB)
                // 0.01 ≈ -40dB — a reasonable speech threshold
                const speaking = inputLevel > 0.01;

                if (speaking !== isSpeakingRef.current) {
                    isSpeakingRef.current = speaking;
                    setIsSpeaking(speaking);
                    broadcast({
                        type: "voice:speaking",
                        userId: self.id,
                        isSpeaking: speaking,
                    });
                }
            } catch (_) {
                // Sender not ready yet — skip this tick
            }
        }, 200);
    }, [self, broadcast]);

    const stopSpeakingDetection = useCallback(() => {
        if (speakingPollRef.current) {
            clearInterval(speakingPollRef.current);
            speakingPollRef.current = null;
        }
        localSenderRef.current = null;
    }, []);

    // ─────────────────────────────────────────────────────
    // Drain ICE queue
    // ─────────────────────────────────────────────────────
    const drainIceQueue = useCallback(async (
        pc: RTCPeerConnection,
        userId: string,
    ) => {
        const queued = iceCandidateQueueRef.current.get(userId) ?? [];
        iceCandidateQueueRef.current.delete(userId);
        for (const candidate of queued) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn("[voice] queued ICE candidate failed", e);
            }
        }
    }, []);

    // ─────────────────────────────────────────────────────
    // Clean up one peer
    // ─────────────────────────────────────────────────────
    const cleanupPeer = useCallback((userId: string) => {
        const pc = peersRef.current.get(userId);
        if (pc) {
            pc.getSenders().forEach(sender => {
                try { pc.removeTrack(sender); } catch (_) { }
            });
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.onconnectionstatechange = null;
            pc.onnegotiationneeded = null;
            pc.close();
            peersRef.current.delete(userId);
        }

        iceCandidateQueueRef.current.delete(userId);
        negotiatingRef.current.delete(userId);
        peerStreamIdRef.current.delete(userId);

        const audio = audioElemsRef.current.get(userId);
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            audio.remove();
            audioElemsRef.current.delete(userId);
        }

        setParticipants(prev => prev.filter(p => p.userId !== userId));
    }, []);

    // ─────────────────────────────────────────────────────
    // Attach remote audio
    // Uses event.streams[0] directly — preserves the stream ID
    // that the browser's AEC uses as its far-end reference.
    // Guarded by stream ID — prevents double attachment.
    // ─────────────────────────────────────────────────────
    const attachRemoteAudio = useCallback((
        userId: string,
        stream: MediaStream,
    ) => {
        // Same stream — nothing changed, skip to avoid restart glitch
        if (peerStreamIdRef.current.get(userId) === stream.id) return;
        peerStreamIdRef.current.set(userId, stream.id);

        let audio = audioElemsRef.current.get(userId);

        if (!audio) {
            audio = document.createElement("audio");
            audio.setAttribute("playsinline", "");
            audio.setAttribute("aria-hidden", "true");
            audio.autoplay = true;
            try { (audio as any).disableRemotePlayback = true; } catch (_) { }
            audioContainerRef.current?.appendChild(audio);
            audioElemsRef.current.set(userId, audio);
        }

        audio.pause();
        audio.srcObject = stream;

        const p = audio.play();
        if (p !== undefined) {
            p.catch(() => {
                const unblock = () => {
                    audio!.play().catch(() => { });
                };
                document.addEventListener("click", unblock, { once: true });
                document.addEventListener("keydown", unblock, { once: true });
                document.addEventListener("touchend", unblock, { once: true, passive: true });
            });
        }
    }, []);

    // ─────────────────────────────────────────────────────
    // Create or get peer connection
    // ─────────────────────────────────────────────────────
    const getOrCreatePeer = useCallback((userId: string): RTCPeerConnection => {
        if (peersRef.current.has(userId)) {
            return peersRef.current.get(userId)!;
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        localStreamRef.current?.getTracks().forEach(track => {
            const sender = pc.addTrack(track, localStreamRef.current!);
            // Store the first audio sender for speaking detection stats
            if (track.kind === "audio" && !localSenderRef.current) {
                localSenderRef.current = sender;
            }
        });

        pc.ontrack = (event) => {
            if (event.track.kind !== "audio") return;
            if (event.streams?.[0]) {
                attachRemoteAudio(userId, event.streams[0]);
            }
        };

        pc.onicecandidate = (event) => {
            if (!event.candidate || !self) return;
            const c = event.candidate.toJSON();
            broadcast({
                type: "voice:ice-candidate",
                fromId: self.id,
                toId: userId,
                candidate: {
                    candidate: c.candidate,
                    sdpMid: c.sdpMid ?? null,
                    sdpMLineIndex: c.sdpMLineIndex ?? null,
                    usernameFragment: c.usernameFragment ?? null,
                },
            });
        };

        pc.onconnectionstatechange = () => {
            if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
                cleanupPeer(userId);
            }
        };

        peersRef.current.set(userId, pc);
        return pc;
    }, [self, broadcast, cleanupPeer, attachRemoteAudio]);

    // ─────────────────────────────────────────────────────
    // Create and send offer (with lock)
    // ─────────────────────────────────────────────────────
    const createAndSendOffer = useCallback(async (targetUserId: string) => {
        if (!self) return;
        if (negotiatingRef.current.has(targetUserId)) return;
        negotiatingRef.current.add(targetUserId);

        try {
            const pc = getOrCreatePeer(targetUserId);
            if (pc.signalingState === "stable" && pc.connectionState === "connected") return;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            broadcast({
                type: "voice:offer",
                fromId: self.id,
                toId: targetUserId,
                sdp: { type: offer.type, sdp: offer.sdp },
            });
        } catch (e) {
            console.error("[voice] offer error", e);
        } finally {
            negotiatingRef.current.delete(targetUserId);
        }
    }, [self, broadcast, getOrCreatePeer]);

    // ─────────────────────────────────────────────────────
    // Event listener
    // ─────────────────────────────────────────────────────
    useEventListener(({ event }) => {
        if (!self) return;

        if (event.type === "voice:already-here" && event.userId !== self.id) {
            setParticipants(prev => {
                if (prev.find(p => p.userId === event.userId)) return prev;
                return [...prev, {
                    userId: event.userId,
                    userName: event.userName,
                    userColor: event.userColor,
                    userImage: event.userImage,
                    isMuted: event.isMuted,
                    isSpeaking: false,
                }];
            });
            if (self.id > event.userId) createAndSendOffer(event.userId);
        }

        if (event.type === "voice:join" && event.userId !== self.id) {
            setParticipants(prev => {
                if (prev.find(p => p.userId === event.userId)) return prev;
                return [...prev, {
                    userId: event.userId,
                    userName: event.userName,
                    userColor: event.userColor,
                    userImage: event.userImage,
                    isMuted: false,
                    isSpeaking: false,
                }];
            });

            if (isInVoiceRef.current) {
                broadcast({
                    type: "voice:already-here",
                    userId: self.id,
                    userName: self.info?.name ?? "Anonymous",
                    userColor: self.info?.color ?? "#58a6ff",
                    userImage: self.info?.picture ?? "",
                    isMuted: isMutedRef.current,
                });
                if (self.id > event.userId) createAndSendOffer(event.userId);
            }
        }

        if (event.type === "voice:offer" && event.toId === self.id) {
            const existing = peersRef.current.get(event.fromId);
            if (existing &&
                existing.signalingState !== "stable" &&
                existing.signalingState !== "have-local-offer") {
                cleanupPeer(event.fromId);
            }

            const pc = getOrCreatePeer(event.fromId);
            pc.setRemoteDescription(
                new RTCSessionDescription(event.sdp as RTCSessionDescriptionInit))
                .then(() => drainIceQueue(pc, event.fromId))
                .then(() => pc.createAnswer())
                .then(answer => pc.setLocalDescription(answer).then(() => answer))
                .then(answer => broadcast({
                    type: "voice:answer",
                    fromId: self.id,
                    toId: event.fromId,
                    sdp: { type: answer.type, sdp: answer.sdp },
                }))
                .catch(e => console.error("[voice] answer error", e));
        }

        if (event.type === "voice:answer" && event.toId === self.id) {
            const pc = peersRef.current.get(event.fromId);
            if (pc && pc.signalingState !== "stable") {
                pc.setRemoteDescription(
                    new RTCSessionDescription(event.sdp as RTCSessionDescriptionInit))
                    .then(() => drainIceQueue(pc, event.fromId))
                    .catch(e => console.error("[voice] setRemoteDescription error", e));
            }
        }

        if (event.type === "voice:ice-candidate" && event.toId === self.id) {
            const pc = peersRef.current.get(event.fromId);
            if (!pc || !pc.remoteDescription) {
                const queue = iceCandidateQueueRef.current.get(event.fromId) ?? [];
                queue.push(event.candidate as RTCIceCandidateInit);
                iceCandidateQueueRef.current.set(event.fromId, queue);
            } else {
                pc.addIceCandidate(
                    new RTCIceCandidate(event.candidate as RTCIceCandidateInit))
                    .catch(e => console.warn("[voice] addIceCandidate error", e));
            }
        }

        if (event.type === "voice:mute-state" && event.userId !== self.id) {
            setParticipants(prev =>
                prev.map(p =>
                    p.userId === event.userId ? { ...p, isMuted: event.isMuted } : p
                )
            );
        }

        if (event.type === "voice:speaking" && event.userId !== self.id) {
            setParticipants(prev =>
                prev.map(p =>
                    p.userId === event.userId ? { ...p, isSpeaking: event.isSpeaking } : p
                )
            );
        }

        if (event.type === "voice:leave" && event.userId !== self.id) {
            cleanupPeer(event.userId);
        }
    });

    // ─────────────────────────────────────────────────────
    // Join voice
    // ─────────────────────────────────────────────────────
    const joinVoice = useCallback(async () => {
        if (!self || isInVoiceRef.current) return;
        setError(null);

        const tryGetStream = async (exact: boolean) => {
            return navigator.mediaDevices.getUserMedia({
                audio: exact ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: { ideal: 48000 },
                    // @ts-ignore - Advanced Chrome constraints for aggressive AEC
                    googEchoCancellation: true,
                    googExperimentalEchoCancellation: true,
                    googNoiseSuppression: true,
                    googExperimentalNoiseSuppression: true,
                    googAutoGainControl: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                } : {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    channelCount: { ideal: 1 },
                },
                video: false,
            });
        };

        try {
            let stream: MediaStream;
            try {
                stream = await tryGetStream(true);
            } catch (constraintErr: any) {
                if (constraintErr.name === "OverconstrainedError") {
                    stream = await tryGetStream(false);
                } else {
                    throw constraintErr;
                }
            }

            localStreamRef.current = stream;
            isMutedRef.current = false;
            isInVoiceRef.current = true; // synchronous — before broadcast
            setIsInVoice(true);
            setIsMuted(false);

            setParticipants([{
                userId: self.id,
                userName: self.info?.name ?? "Anonymous",
                userColor: self.info?.color ?? "#58a6ff",
                userImage: self.info?.picture ?? "",
                isMuted: false,
                isSpeaking: false,
            }]);

            broadcast({
                type: "voice:join",
                userId: self.id,
                userName: self.info?.name ?? "Anonymous",
                userColor: self.info?.color ?? "#58a6ff",
                userImage: self.info?.picture ?? "",
            });

            // Start speaking detection AFTER first peer connects
            // (we need a sender to poll stats from)
            // The startSpeakingDetection call is deferred to getOrCreatePeer

        } catch (err: any) {
            isInVoiceRef.current = false;
            if (err.name === "NotAllowedError") {
                setError("Microphone permission denied. Please allow microphone access and try again.");
            } else if (err.name === "NotFoundError") {
                setError("No microphone found. Please connect a microphone and try again.");
            } else {
                setError("Could not access microphone. Please check your settings.");
            }
        }
    }, [self, broadcast]);

    // ─────────────────────────────────────────────────────
    // Leave voice
    // ─────────────────────────────────────────────────────
    const leaveVoice = useCallback(() => {
        if (!self) return;
        isInVoiceRef.current = false;

        stopSpeakingDetection();

        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

        peersRef.current.forEach((_, userId) => cleanupPeer(userId));
        peersRef.current.clear();
        negotiatingRef.current.clear();
        peerStreamIdRef.current.clear();

        broadcast({ type: "voice:leave", userId: self.id });

        isMutedRef.current = false;
        isSpeakingRef.current = false;
        setIsInVoice(false);
        setIsMuted(false);
        setIsSpeaking(false);
        setParticipants([]);
    }, [self, broadcast, cleanupPeer, stopSpeakingDetection]);

    // Start speaking detection once we have a peer connection with a sender
    // (called inside getOrCreatePeer after first peer is established)
    useEffect(() => {
        if (!isInVoice) return;
        // Give the peer connection a moment to set up the sender
        const t = setTimeout(() => {
            if (isInVoiceRef.current) startSpeakingDetection();
        }, 1500);
        return () => clearTimeout(t);
    }, [isInVoice, startSpeakingDetection]);

    // ─────────────────────────────────────────────────────
    // Toggle mute
    // ─────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        if (!localStreamRef.current || !self) return;
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (!audioTrack) return;

        const newMuted = !isMutedRef.current;
        audioTrack.enabled = !newMuted;
        isMutedRef.current = newMuted;
        setIsMuted(newMuted);

        broadcast({ type: "voice:mute-state", userId: self.id, isMuted: newMuted });
        setParticipants(prev =>
            prev.map(p => p.userId === self.id ? { ...p, isMuted: newMuted } : p)
        );
    }, [self, broadcast]);

    // ─────────────────────────────────────────────────────
    // Cleanup on unmount
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            isInVoiceRef.current = false;
            stopSpeakingDetection();
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            peersRef.current.forEach(pc => {
                pc.getSenders().forEach(s => { try { pc.removeTrack(s); } catch (_) { } });
                pc.ontrack = null; pc.onicecandidate = null;
                pc.onconnectionstatechange = null; pc.close();
            });
            peersRef.current.clear();
            audioElemsRef.current.forEach(a => { a.pause(); a.srcObject = null; a.remove(); });
            audioElemsRef.current.clear();
            negotiatingRef.current.clear();
            peerStreamIdRef.current.clear();
        };
    }, [stopSpeakingDetection]);

    return {
        isInVoice, isMuted, isSpeaking, participants, error,
        joinVoice, leaveVoice, toggleMute,
        clearError: () => setError(null),
    };
}