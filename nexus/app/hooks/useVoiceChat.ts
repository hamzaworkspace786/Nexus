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

    // ── Internal refs ──────────────────────────────────────
    const localStreamRef = useRef<MediaStream | null>(null);
    const isMutedRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const isInVoiceRef = useRef(false); // ref mirror so event listener always sees current value

    // peerId → RTCPeerConnection
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    // FIX: negotiation lock — prevents both sides from creating offers simultaneously
    // Tracks which peers we are currently negotiating with
    const negotiatingRef = useRef<Set<string>>(new Set());

    // ICE candidate queue — holds candidates that arrived before remoteDescription was set
    const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    // Hidden DOM container for audio elements (required for mobile + strict browsers)
    const audioContainerRef = useRef<HTMLDivElement | null>(null);
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // AudioContext for speaking detection
    const audioCtxRef = useRef<AudioContext | null>(null);
    const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Keep isInVoiceRef in sync
    useEffect(() => { isInVoiceRef.current = isInVoice; }, [isInVoice]);

    // ── Create hidden audio container once on mount ────────
    useEffect(() => {
        const div = document.createElement("div");
        div.style.cssText =
            "position:fixed;width:0;height:0;overflow:hidden;" +
            "pointer-events:none;visibility:hidden;";
        div.setAttribute("aria-hidden", "true");
        document.body.appendChild(div);
        audioContainerRef.current = div;
        return () => { div.remove(); };
    }, []);

    // ─────────────────────────────────────────────────────
    // Drain queued ICE candidates after remoteDescription is set
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
    // Clean up one peer connection completely
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
            pc.close();
            peersRef.current.delete(userId);
        }

        iceCandidateQueueRef.current.delete(userId);
        negotiatingRef.current.delete(userId);

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
    // Attach remote audio — handles both first attach and track replacement
    // Key insight: we reuse the same <audio> element per peer and only
    // create a new MediaStream when the track itself has changed.
    // This prevents the browser AEC from losing its reference frame.
    // ─────────────────────────────────────────────────────
    const attachRemoteAudio = useCallback((userId: string, track: MediaStreamTrack) => {
        let audio = audioElemsRef.current.get(userId);

        if (audio) {
            // Audio element already exists for this peer.
            // Check if the track is the same one we already have — if so, do nothing.
            const existingStream = audio.srcObject as MediaStream | null;
            if (existingStream) {
                const existingTrack = existingStream.getAudioTracks()[0];
                if (existingTrack && existingTrack.id === track.id) {
                    // Exact same track — no action needed, avoids resonation
                    return;
                }
                // Different track (renegotiation) — replace it cleanly
                existingStream.removeTrack(existingTrack);
                existingStream.addTrack(track);
                // No need to reassign srcObject — same MediaStream object, AEC stays aligned
                return;
            }
        }

        // First time — create the audio element
        if (!audio) {
            audio = document.createElement("audio");
            audio.setAttribute("playsinline", "");    // iOS Safari
            audio.setAttribute("aria-hidden", "true");
            audio.autoplay = true;
            // Prevent Chromecast/remote playback which causes double audio
            try { (audio as any).disableRemotePlayback = true; } catch (_) { }
            audioContainerRef.current?.appendChild(audio);
            audioElemsRef.current.set(userId, audio);
        }

        // Create the MediaStream and assign it
        const remoteStream = new MediaStream([track]);
        audio.srcObject = remoteStream;

        // Explicit play with user-gesture fallback
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                const unblock = () => {
                    audio!.play().catch(() => { });
                    document.removeEventListener("click", unblock);
                };
                document.addEventListener("click", unblock);
            });
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

        // Add our mic tracks
        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        // Attach remote audio when we receive their track
        // ontrack can fire multiple times (renegotiation, replaceTrack, etc.)
        // attachRemoteAudio handles deduplication by comparing track.id
        pc.ontrack = (event) => {
            if (event.track.kind !== "audio") return;
            attachRemoteAudio(userId, event.track);
        };

        // Broadcast ICE candidates via Liveblocks as the signaling channel
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
    // Safe offer creation — prevents both sides from creating offers simultaneously
    // Only the peer with the lexicographically HIGHER id creates the offer.
    // This is checked before calling this function.
    // The lock prevents duplicate offers from rapid event delivery.
    // ─────────────────────────────────────────────────────
    const createAndSendOffer = useCallback(async (targetUserId: string) => {
        if (!self) return;

        // FIX: negotiation lock — if we're already negotiating with this peer, skip
        if (negotiatingRef.current.has(targetUserId)) return;
        negotiatingRef.current.add(targetUserId);

        try {
            const pc = getOrCreatePeer(targetUserId);

            // If the connection is already stable (fully negotiated), don't re-offer
            if (pc.signalingState === "stable" && pc.connectionState === "connected") {
                negotiatingRef.current.delete(targetUserId);
                return;
            }

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
    // Speaking detection
    // AudioContext is resumed safely after user gesture
    // Analyser is NOT connected to ctx.destination (no speaker feedback)
    // ─────────────────────────────────────────────────────
    const startSpeakingDetection = useCallback((stream: MediaStream) => {
        const AudioContextClass =
            window.AudioContext ?? (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass() as AudioContext;
        audioCtxRef.current = ctx;

        const tryResume = () => {
            if (ctx.state === "suspended") ctx.resume().catch(() => { });
        };

        // Resume immediately (works if user already interacted with page)
        tryResume();

        // One-time gesture listeners as fallback
        ["click", "keydown", "touchstart"].forEach(evt =>
            document.addEventListener(evt, tryResume, { once: true, passive: true })
        );

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4; // smoother volume readings

        // source → analyser only — deliberately NOT connected to ctx.destination
        // connecting to destination would play the mic back through speakers = echo
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        speakingIntervalRef.current = setInterval(() => {
            if (ctx.state !== "running") return;
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            const speaking = avg > 15;

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

        // Existing user announced themselves to a new joiner
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

            // Only the peer with higher ID creates the offer — deterministic, no race
            if (self.id > event.userId) {
                createAndSendOffer(event.userId);
            }
        }

        // New user joined the voice channel
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

            // We are already in voice — announce ourselves to the new joiner
            if (isInVoiceRef.current) {
                broadcast({
                    type: "voice:already-here",
                    userId: self.id,
                    userName: self.info?.name ?? "Anonymous",
                    userColor: self.info?.color ?? "#58a6ff",
                    userImage: self.info?.picture ?? "",
                    isMuted: isMutedRef.current,
                });

                // Existing user with higher ID initiates the offer
                if (self.id > event.userId) {
                    createAndSendOffer(event.userId);
                }
            }
        }

        // Received an offer — create and send an answer
        if (event.type === "voice:offer" && event.toId === self.id) {
            // FIX: If we already have a peer in a non-initial state, clean it first
            // to prevent stacking multiple audio streams on renegotiation
            const existingPc = peersRef.current.get(event.fromId);
            if (existingPc && existingPc.signalingState !== "stable" && existingPc.signalingState !== "have-local-offer") {
                // Connection is in a weird state — reset it
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

        // Received an answer — complete the handshake
        if (event.type === "voice:answer" && event.toId === self.id) {
            const pc = peersRef.current.get(event.fromId);
            if (pc && pc.signalingState !== "stable") {
                pc.setRemoteDescription(
                    new RTCSessionDescription(event.sdp as RTCSessionDescriptionInit))
                    .then(() => drainIceQueue(pc, event.fromId))
                    .catch(e => console.error("[voice] setRemoteDescription error", e));
            }
        }

        // ICE candidate — queue if remoteDescription isn't set yet
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

        // Remote mute state changed
        if (event.type === "voice:mute-state" && event.userId !== self.id) {
            setParticipants(prev =>
                prev.map(p =>
                    p.userId === event.userId ? { ...p, isMuted: event.isMuted } : p
                )
            );
        }

        // Remote speaking state changed
        if (event.type === "voice:speaking" && event.userId !== self.id) {
            setParticipants(prev =>
                prev.map(p =>
                    p.userId === event.userId
                        ? { ...p, isSpeaking: event.isSpeaking }
                        : p
                )
            );
        }

        // Someone left voice
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
            // Strict constraints ensure hardware AEC is actually engaged.
            // echoCancellation is set to EXACT true — if the browser can't
            // provide AEC it will error rather than silently skip it.
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,       // exact — must have AEC
                    noiseSuppression: true,        // exact — must have NS
                    autoGainControl: true,         // exact — must have AGC
                    channelCount: 1,               // exact mono — stereo bypasses AEC on some laptops
                    sampleRate: { ideal: 48000 },  // ideal — best for Opus codec
                    sampleSize: { ideal: 16 },
                },
                video: false,
            });

            localStreamRef.current = stream;
            isMutedRef.current = false;
            setIsInVoice(true);
            setIsMuted(false);

            startSpeakingDetection(stream);

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

        } catch (err: any) {
            if (err.name === "NotAllowedError") {
                setError("Microphone permission denied. Please allow microphone access and try again.");
            } else if (err.name === "NotFoundError") {
                setError("No microphone found. Please connect a microphone and try again.");
            } else if (err.name === "OverconstrainedError") {
                // Fallback: if exact constraints fail, try with ideal hints
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: { ideal: true },
                            noiseSuppression: { ideal: true },
                            autoGainControl: { ideal: true },
                            channelCount: { ideal: 1 },
                        },
                        video: false,
                    });

                    localStreamRef.current = fallbackStream;
                    isMutedRef.current = false;
                    setIsInVoice(true);
                    setIsMuted(false);

                    startSpeakingDetection(fallbackStream);

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
                } catch {
                    setError("Could not access microphone. Please check your settings.");
                }
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

        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

        if (speakingIntervalRef.current) {
            clearInterval(speakingIntervalRef.current);
            speakingIntervalRef.current = null;
        }
        audioCtxRef.current?.close().catch(() => { });
        audioCtxRef.current = null;

        peersRef.current.forEach((_, userId) => cleanupPeer(userId));
        peersRef.current.clear();
        negotiatingRef.current.clear();

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
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
            audioCtxRef.current?.close().catch(() => { });
            peersRef.current.forEach(pc => {
                pc.getSenders().forEach(s => { try { pc.removeTrack(s); } catch (_) { } });
                pc.ontrack = null;
                pc.onicecandidate = null;
                pc.onconnectionstatechange = null;
                pc.close();
            });
            peersRef.current.clear();
            audioElemsRef.current.forEach(a => {
                a.pause();
                a.srcObject = null;
                a.remove();
            });
            audioElemsRef.current.clear();
            negotiatingRef.current.clear();
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