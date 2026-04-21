// app/hooks/useVoiceChat.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    useBroadcastEvent,
    useEventListener,
    useSelf,
} from "@liveblocks/react/suspense";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type VoiceParticipant = {
    userId: string;
    userName: string;
    userColor: string;
    userImage: string;
    isMuted: boolean;
    isSpeaking: boolean;
};

// Google's free public STUN servers — no API key needed
const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
];

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────
export function useVoiceChat() {
    const self = useSelf();
    const broadcast = useBroadcastEvent();

    // ── Public state ───────────────────────────────────────
    const [isInVoice, setIsInVoice] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [error, setError] = useState<string | null>(null);

    // ── Internal refs (mutations here never cause re-renders) ─
    const localStreamRef = useRef<MediaStream | null>(null);
    const isMutedRef = useRef(false);   // mirror of isMuted for use in callbacks
    const isSpeakingRef = useRef(false);   // mirror of isSpeaking for throttling

    // peerId → RTCPeerConnection
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    // FIX #3 — ICE candidate queue
    // If a candidate arrives before setRemoteDescription completes we store it here
    // and drain it once the remote description is set
    const iceCandidateQueueRef = useRef<Map<string, any[]>>(new Map());

    // FIX #4 — Audio elements MUST be in the DOM to play on mobile / strict browsers
    // We keep a hidden container div appended to <body>
    const audioContainerRef = useRef<HTMLDivElement | null>(null);
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // FIX #5 — AudioContext reference so we can resume() it after user gesture
    const audioCtxRef = useRef<AudioContext | null>(null);
    const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Create hidden audio container on mount ────────────
    useEffect(() => {
        const div = document.createElement("div");
        div.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
        div.setAttribute("aria-hidden", "true");
        document.body.appendChild(div);
        audioContainerRef.current = div;

        return () => {
            div.remove();
        };
    }, []);

    // ─────────────────────────────────────────────────────
    // FIX #6 — Clean peer: remove senders before closing
    // ─────────────────────────────────────────────────────
    const cleanupPeer = useCallback((userId: string) => {
        const pc = peersRef.current.get(userId);
        if (pc) {
            // Remove all senders so tracks are cleanly detached
            pc.getSenders().forEach(sender => {
                try { pc.removeTrack(sender); } catch (_) { }
            });
            pc.close();
            peersRef.current.delete(userId);
        }

        // Remove queued ICE candidates for this peer
        iceCandidateQueueRef.current.delete(userId);

        // FIX #4 — detach and remove the audio element from DOM
        const audio = audioElemsRef.current.get(userId);
        if (audio) {
            audio.srcObject = null;
            audio.remove();           // removes from DOM container
            audioElemsRef.current.delete(userId);
        }

        setParticipants(prev => prev.filter(p => p.userId !== userId));
    }, []);

    // ─────────────────────────────────────────────────────
    // FIX #3 — Drain queued ICE candidates for a peer
    // Call this after setRemoteDescription completes
    // ─────────────────────────────────────────────────────
    const drainIceQueue = useCallback(async (pc: RTCPeerConnection, userId: string) => {
        const queued = iceCandidateQueueRef.current.get(userId) ?? [];
        iceCandidateQueueRef.current.delete(userId);
        for (const candidate of queued) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
            } catch (e) {
                console.warn("[voice] failed to add queued ICE candidate", e);
            }
        }
    }, []);

    // ─────────────────────────────────────────────────────
    // Create or retrieve a RTCPeerConnection for a user
    // ─────────────────────────────────────────────────────
    const getOrCreatePeer = useCallback((userId: string): RTCPeerConnection => {
        if (peersRef.current.has(userId)) {
            return peersRef.current.get(userId)!;
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Add local mic tracks to this peer connection
        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        // When we receive their audio stream — create a DOM-attached <audio>
        pc.ontrack = (event) => {
            // FIX #4 — attach audio element to the hidden DOM container
            let audio = audioElemsRef.current.get(userId);
            if (!audio) {
                audio = document.createElement("audio");
                audio.autoplay = true;
                audio.setAttribute("playsinline", "");   // iOS Safari
                audio.setAttribute("aria-hidden", "true");
                audioContainerRef.current?.appendChild(audio); // attach to DOM
                audioElemsRef.current.set(userId, audio);
            }
            audio.srcObject = event.streams[0];

            // Some browsers need an explicit .play() call
            audio.play().catch(() => {
                // Autoplay blocked — will play after next user interaction
            });
        };

        // Broadcast ICE candidates to the other peer via Liveblocks
        // We spread toJSON() to get a plain object Liveblocks accepts
        pc.onicecandidate = (event) => {
            if (event.candidate && self) {
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
            }
        };

        // Clean up when the connection drops naturally
        pc.onconnectionstatechange = () => {
            if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
                cleanupPeer(userId);
            }
        };

        peersRef.current.set(userId, pc);
        return pc;
    }, [self, broadcast, cleanupPeer]);

    // ─────────────────────────────────────────────────────
    // FIX #5 — Speaking detection with AudioContext resume
    // ─────────────────────────────────────────────────────
    const startSpeakingDetection = useCallback((stream: MediaStream) => {
        const AudioContextClass =
            window.AudioContext ?? (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass() as AudioContext;
        audioCtxRef.current = ctx;

        const resume = () => {
            if (ctx.state === "suspended") ctx.resume();
        };

        // Resume on ANY user gesture — covers the suspended-by-default case
        document.addEventListener("click", resume, { once: true });
        document.addEventListener("keydown", resume, { once: true });
        document.addEventListener("touchstart", resume, { once: true, passive: true });

        // FIX #5 — resume immediately (works if already interacted)
        ctx.resume().catch(() => { });

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        speakingIntervalRef.current = setInterval(() => {
            if (ctx.state !== "running") return; // skip if still suspended
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            const speaking = avg > 15;

            // FIX #2 — only broadcast when state actually changes (throttle)
            if (speaking !== isSpeakingRef.current && self) {
                isSpeakingRef.current = speaking;
                setIsSpeaking(speaking);
                broadcast({ type: "voice:speaking", userId: self.id, isSpeaking: speaking });
            }
        }, 150);
    }, [self, broadcast]);

    // ─────────────────────────────────────────────────────
    // Liveblocks event listener
    // ─────────────────────────────────────────────────────
    useEventListener(({ event }) => {
        if (!self) return;

        // ── FIX #1 — existing user announced themselves ───
        // Someone was already in voice when we joined.
        // They sent voice:already-here directly in response to our voice:join.
        if (event.type === "voice:already-here" && event.userId !== self.id) {
            // Add them to our participant list if not already there
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

            // The already-existing user has the lower ID lexicographically,
            // so WE (the new joiner) create the offer to them
            if (self.id > event.userId) {
                const pc = getOrCreatePeer(event.userId);
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer).then(() => offer))
                    .then(offer => {
                        broadcast({
                            type: "voice:offer",
                            fromId: self.id,
                            toId: event.userId,
                            sdp: { type: offer.type, sdp: offer.sdp },
                        });
                    })
                    .catch(e => console.error("[voice] offer error", e));
            }
        }

        // ── Someone new joined ────────────────────────────
        if (event.type === "voice:join" && event.userId !== self.id) {
            // Add them to our participant list
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

            // FIX #1 — If WE are already in voice, announce ourselves back
            // so the new joiner knows we exist
            if (isInVoice) {
                broadcast({
                    type: "voice:already-here",
                    userId: self.id,
                    userName: self.info?.name ?? "Anonymous",
                    userColor: self.info?.color ?? "#58a6ff",
                    userImage: self.info?.picture ?? "",
                    isMuted: isMutedRef.current,
                });
            }

            // Existing user with higher ID creates the offer
            if (isInVoice && self.id > event.userId) {
                const pc = getOrCreatePeer(event.userId);
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer).then(() => offer))
                    .then(offer => {
                        broadcast({
                            type: "voice:offer",
                            fromId: self.id,
                            toId: event.userId,
                            sdp: { type: offer.type, sdp: offer.sdp },
                        });
                    })
                    .catch(e => console.error("[voice] offer error", e));
            }
        }

        // ── Received an offer — send back an answer ───────
        if (event.type === "voice:offer" && event.toId === self.id) {
            const pc = getOrCreatePeer(event.fromId);
            pc.setRemoteDescription(new RTCSessionDescription(event.sdp as RTCSessionDescriptionInit))
                .then(() => drainIceQueue(pc, event.fromId))
                .then(() => pc.createAnswer())
                .then(answer => pc.setLocalDescription(answer).then(() => answer))
                .then(answer => {
                    broadcast({
                        type: "voice:answer",
                        fromId: self.id,
                        toId: event.fromId,
                        sdp: { type: answer.type, sdp: answer.sdp },
                    });
                })
                .catch(e => console.error("[voice] answer error", e));
        }

        // ── Received an answer — complete the handshake ───
        if (event.type === "voice:answer" && event.toId === self.id) {
            const pc = peersRef.current.get(event.fromId);
            if (pc && pc.signalingState !== "stable") {
                pc.setRemoteDescription(new RTCSessionDescription(event.sdp as RTCSessionDescriptionInit))
                    .then(() => drainIceQueue(pc, event.fromId))
                    .catch(e => console.error("[voice] setRemoteDescription error", e));
            }
        }

        // ── FIX #3 — Received an ICE candidate ───────────
        if (event.type === "voice:ice-candidate" && event.toId === self.id) {
            const pc = peersRef.current.get(event.fromId);

            if (!pc || !pc.remoteDescription) {
                // Remote description not ready yet — queue the candidate
                const queue = iceCandidateQueueRef.current.get(event.fromId) ?? [];
                queue.push(event.candidate);
                iceCandidateQueueRef.current.set(event.fromId, queue);
            } else {
                pc.addIceCandidate(new RTCIceCandidate(event.candidate as RTCIceCandidateInit))
                    .catch(e => console.warn("[voice] addIceCandidate error", e));
            }
        }

        // ── FIX #2 — Remote user changed mute state ──────
        if (event.type === "voice:mute-state" && event.userId !== self.id) {
            setParticipants(prev =>
                prev.map(p =>
                    p.userId === event.userId ? { ...p, isMuted: event.isMuted } : p
                )
            );
        }

        // ── FIX #2 — Remote user speaking state ──────────
        if (event.type === "voice:speaking" && event.userId !== self.id) {
            setParticipants(prev =>
                prev.map(p =>
                    p.userId === event.userId ? { ...p, isSpeaking: event.isSpeaking } : p
                )
            );
        }

        // ── Someone left ──────────────────────────────────
        if (event.type === "voice:leave" && event.userId !== self.id) {
            cleanupPeer(event.userId);
        }
    });

    // ─────────────────────────────────────────────────────
    // Join voice
    // ─────────────────────────────────────────────────────
    const joinVoice = useCallback(async () => {
        if (!self || isInVoice) return;
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
                video: false,
            });

            localStreamRef.current = stream;
            isMutedRef.current = false;
            setIsInVoice(true);
            setIsMuted(false);

            startSpeakingDetection(stream);

            // Add ourselves to participant list first
            setParticipants([{
                userId: self.id,
                userName: self.info?.name ?? "Anonymous",
                userColor: self.info?.color ?? "#58a6ff",
                userImage: self.info?.picture ?? "",
                isMuted: false,
                isSpeaking: false,
            }]);

            // Broadcast that we joined — existing users will respond with voice:already-here
            broadcast({
                type: "voice:join",
                userId: self.id,
                userName: self.info?.name ?? "Anonymous",
                userColor: self.info?.color ?? "#58a6ff",
                userImage: self.info?.picture ?? "",
            });

        } catch (err: any) {
            if (err.name === "NotAllowedError") {
                setError("Microphone permission denied. Please allow microphone access and try again.");
            } else if (err.name === "NotFoundError") {
                setError("No microphone found. Please connect a microphone and try again.");
            } else {
                setError("Could not access microphone. Please check your settings.");
            }
        }
    }, [self, isInVoice, broadcast, startSpeakingDetection]);

    // ─────────────────────────────────────────────────────
    // Leave voice
    // ─────────────────────────────────────────────────────
    const leaveVoice = useCallback(() => {
        if (!self) return;

        // Stop mic tracks
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

        // Stop speaking detection and close AudioContext
        if (speakingIntervalRef.current) {
            clearInterval(speakingIntervalRef.current);
            speakingIntervalRef.current = null;
        }
        audioCtxRef.current?.close().catch(() => { });
        audioCtxRef.current = null;

        // FIX #6 — close all peers with track cleanup
        peersRef.current.forEach((_, userId) => cleanupPeer(userId));
        peersRef.current.clear();

        // Tell everyone we left
        broadcast({ type: "voice:leave", userId: self.id });

        isMutedRef.current = false;
        isSpeakingRef.current = false;
        setIsInVoice(false);
        setIsMuted(false);
        setIsSpeaking(false);
        setParticipants([]);
    }, [self, broadcast, cleanupPeer]);

    // ─────────────────────────────────────────────────────
    // Toggle mute
    // ─────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        if (!localStreamRef.current || !self) return;

        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (!audioTrack) return;

        const newMuted = !isMutedRef.current;
        audioTrack.enabled = !newMuted;   // enabled = true means NOT muted
        isMutedRef.current = newMuted;
        setIsMuted(newMuted);

        // FIX #2 — tell everyone our mute state changed
        broadcast({ type: "voice:mute-state", userId: self.id, isMuted: newMuted });

        // Update ourselves in the participants list too
        setParticipants(prev =>
            prev.map(p =>
                p.userId === self.id ? { ...p, isMuted: newMuted } : p
            )
        );
    }, [self, broadcast]);

    // ─────────────────────────────────────────────────────
    // Auto-cleanup on unmount (page navigation)
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (speakingIntervalRef.current) {
                clearInterval(speakingIntervalRef.current);
            }
            audioCtxRef.current?.close().catch(() => { });
            peersRef.current.forEach((pc) => {
                pc.getSenders().forEach(s => { try { pc.removeTrack(s); } catch (_) { } });
                pc.close();
            });
            peersRef.current.clear();
            audioElemsRef.current.forEach(a => {
                a.srcObject = null;
                a.remove();
            });
            audioElemsRef.current.clear();
        };
    }, []);

    return {
        isInVoice,
        isMuted,
        isSpeaking,
        participants,
        error,
        joinVoice,
        leaveVoice,
        toggleMute,
        clearError: () => setError(null),
    };
}