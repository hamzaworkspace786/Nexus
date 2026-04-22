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

    // FIX #1 — track whether we already attached audio for this peer
    // prevents ontrack firing twice and creating a double/resonating stream
    const peerHasAudioRef = useRef<Set<string>>(new Set());

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
        peerHasAudioRef.current.delete(userId); // FIX #1 — clear audio guard

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
    // FIX #1 + #2 — attach remote audio safely, once per peer
    // Uses event.track directly (not event.streams[0]) for reliability
    // ─────────────────────────────────────────────────────
    const attachRemoteAudio = useCallback((userId: string, track: MediaStreamTrack) => {
        // Guard: only attach once per peer — prevents resonation from double-attach
        if (peerHasAudioRef.current.has(userId)) return;
        peerHasAudioRef.current.add(userId);

        // Build a fresh MediaStream from the track directly
        // (event.streams[0] can be empty on first fire in Firefox/Safari)
        const remoteStream = new MediaStream([track]);

        let audio = audioElemsRef.current.get(userId);
        if (!audio) {
            audio = document.createElement("audio");
            audio.setAttribute("playsinline", "");   // iOS Safari
            audio.setAttribute("aria-hidden", "true");
            // FIX #3 — set autoplay BEFORE srcObject so AEC reference is ready
            audio.autoplay = true;

            // Attach to DOM before setting srcObject
            // browser AEC works best when element is in the document
            audioContainerRef.current?.appendChild(audio);
            audioElemsRef.current.set(userId, audio);
        }

        // Set srcObject only once — reassigning causes the resonation
        if (audio.srcObject !== remoteStream) {
            audio.srcObject = remoteStream;
        }

        // Explicit play with user-gesture fallback
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Autoplay blocked — attach one-time click listener to unblock
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

        // FIX #1 + #2 — use ontrack with the guarded attachRemoteAudio
        // This fires once per track, not once per stream renegotiation
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
    // FIX #3 — Speaking detection
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

            // New joiner creates the offer if their ID is higher
            if (self.id > event.userId) {
                const pc = getOrCreatePeer(event.userId);
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer).then(() => offer))
                    .then(offer => broadcast({
                        type: "voice:offer",
                        fromId: self.id,
                        toId: event.userId,
                        sdp: { type: offer.type, sdp: offer.sdp },
                    }))
                    .catch(e => console.error("[voice] offer error", e));
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
                    const pc = getOrCreatePeer(event.userId);
                    pc.createOffer()
                        .then(offer => pc.setLocalDescription(offer).then(() => offer))
                        .then(offer => broadcast({
                            type: "voice:offer",
                            fromId: self.id,
                            toId: event.userId,
                            sdp: { type: offer.type, sdp: offer.sdp },
                        }))
                        .catch(e => console.error("[voice] offer error", e));
                }
            }
        }

        // Received an offer — create and send an answer
        if (event.type === "voice:offer" && event.toId === self.id) {
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
            // FIX #3 — strict constraints ensure hardware AEC is actually engaged
            // "ideal" is a hint the browser can ignore; some constraints need
            // to be exact to force the hardware path on laptops
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    // Force mono — stereo mic input on laptops often bypasses AEC
                    channelCount: { ideal: 1, max: 1 },
                    // Low latency avoids buffering that causes pre-echo
                    latency: { ideal: 0 },
                    sampleRate: { ideal: 48000 },
                    sampleSize: { ideal: 16 },
                } as MediaTrackConstraints,
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
        peerHasAudioRef.current.clear(); // FIX #1 — reset audio guards

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
                pc.close();
            });
            peersRef.current.clear();
            audioElemsRef.current.forEach(a => { a.srcObject = null; a.remove(); });
            audioElemsRef.current.clear();
            peerHasAudioRef.current.clear();
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