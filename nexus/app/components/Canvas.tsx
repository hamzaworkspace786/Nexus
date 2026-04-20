"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Mic, Share2, MousePointer2, Pencil, Square, Type,
    Plus, Undo2, Redo2, Trash2, Check, Copy, X, Link2, Users
} from "lucide-react";
import { Tldraw, Editor, DefaultColorStyle } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useYjsStore } from "@/app/hooks/useYjsStore";

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

const COLOR_MAP: Record<string, string> = {
    black: "#1d1d1d", grey: "#8e8e8e", lightViolet: "#d9d0ff", violet: "#a48fff",
    blue: "#2f80ed", lightBlue: "#9adbff", lightGreen: "#86efac", green: "#27ae60",
    yellow: "#f2c94c", orange: "#f2994a", red: "#eb5757", lightRed: "#ffccd5",
};

// ─────────────────────────────────────────────────────────
// SHARE MODAL
// ─────────────────────────────────────────────────────────
function ShareModal({
    isOpen,
    onClose,
    boardName,
    roomId,
}: {
    isOpen: boolean;
    onClose: () => void;
    boardName: string;
    roomId: string;
}) {
    const [copied, setCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Build the full shareable URL from the current window location
    const shareUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/whiteboard/${roomId}`
            : "";

    const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
        try {
            await navigator.clipboard.writeText(text);
            setter(true);
            setTimeout(() => setter(false), 2500);
        } catch {
            // Fallback for browsers that block clipboard without HTTPS
            if (inputRef.current) {
                inputRef.current.select();
                document.execCommand("copy");
                setter(true);
                setTimeout(() => setter(false), 2500);
            }
        }
    };

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2"
                    >
                        <div className="rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/50">

                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-lime-400">
                                        <Share2 className="h-4 w-4 text-slate-900" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white">Share Board</h2>
                                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{boardName}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5">

                                {/* Anyone with link info */}
                                <div className="flex items-start gap-3 rounded-xl bg-teal-500/8 border border-teal-500/20 p-3.5">
                                    <Users className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-teal-300 leading-relaxed">
                                        <span className="font-semibold">Anyone with this link</span> can view and
                                        collaborate on this board in real time.
                                    </p>
                                </div>

                                {/* Link input + copy */}
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2 block">
                                        Board Link
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                            <input
                                                ref={inputRef}
                                                readOnly
                                                value={shareUrl}
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 pl-9 pr-4 text-xs text-slate-300 outline-none select-all cursor-text font-mono"
                                                onClick={e => (e.target as HTMLInputElement).select()}
                                            />
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(shareUrl, setCopied)}
                                            className={cn(
                                                "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95",
                                                copied
                                                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                                                    : "bg-gradient-to-r from-teal-500 to-lime-400 text-slate-900 shadow-lg shadow-teal-500/20 hover:opacity-90"
                                            )}
                                        >
                                            {copied ? (
                                                <><Check className="h-3.5 w-3.5" /> Copied!</>
                                            ) : (
                                                <><Copy className="h-3.5 w-3.5" /> Copy</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Room ID chip */}
                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Room ID:</span>
                                        <code className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                                            {roomId}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(roomId, setLinkCopied)}
                                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                                    >
                                        {linkCopied ? <><Check className="h-3 w-3 text-teal-400" /><span className="text-teal-400">Copied</span></> : "Copy ID"}
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-800 px-6 py-3">
                                <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest">
                                    Nexus · Real-time Collaboration
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────
// CANVAS (main component)
// ─────────────────────────────────────────────────────────
export function Canvas({
    roomId,
    boardName,
    onBoardNameChange,
}: {
    roomId: string;
    boardName: string;
    onBoardNameChange: (name: string) => void;
}) {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [activeTool, setActiveTool] = useState("select");
    const [activeColor, setActiveColor] = useState("black");
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState(boardName);
    const [shareOpen, setShareOpen] = useState(false); // ← NEW
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setEditingName(boardName); }, [boardName]);

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const handleNameSave = useCallback(() => {
        const trimmed = editingName.trim();
        const finalName = trimmed || "Untitled Board";
        setEditingName(finalName);
        setIsEditingName(false);
        if (finalName !== boardName) onBoardNameChange(finalName);
    }, [editingName, boardName, onBoardNameChange]);

    const handleNameCancel = useCallback(() => {
        setEditingName(boardName);
        setIsEditingName(false);
    }, [boardName]);

    const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleNameSave();
        else if (e.key === "Escape") handleNameCancel();
    }, [handleNameSave, handleNameCancel]);

    const storeWithStatus = useYjsStore(roomId);

    useEffect(() => {
        if (!editor) return;
        const updateState = () => {
            setActiveTool(editor.getCurrentToolId());
            setCanUndo(editor.getCanUndo());
            setCanRedo(editor.getCanRedo());
            setZoom(Math.round(editor.getZoomLevel() * 100));
            const styles = editor.getSharedStyles();
            const colorValue = styles.get(DefaultColorStyle);
            if (typeof colorValue === "string") setActiveColor(colorValue);
        };
        updateState();
        editor.on("change", updateState);
        return () => { editor.off("change", updateState); };
    }, [editor]);

    const selectTool = (tool: string) => { editor?.setCurrentTool(tool); };

    const changeColor = (color: string) => {
        if (!editor) return;
        setActiveColor(color);
        editor.setStyleForNextShapes(DefaultColorStyle, color as any);
        editor.setStyleForSelectedShapes(DefaultColorStyle, color as any);
    };

    const clearCanvas = () => {
        if (!editor) return;
        const ids = Array.from(editor.getCurrentPageShapeIds());
        if (ids.length > 0 && window.confirm("Clear the entire board?")) {
            editor.deleteShapes(ids);
        }
    };

    const activeClass = "bg-gradient-to-r from-teal-500 to-lime-400 text-white shadow-lg shadow-teal-500/20 scale-110";
    const inactiveClass = "text-slate-400 hover:text-slate-600 hover:bg-slate-50";

    return (
        <div className="relative h-screen w-full bg-[#f8fafc] overflow-hidden font-sans select-none">

            {/* Share Modal */}
            <ShareModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                boardName={boardName}
                roomId={roomId}
            />

            {/* Canvas */}
            <div className="absolute inset-0 z-0">
                {storeWithStatus.status === "loading" ? (
                    <div className="flex items-center justify-center h-full w-full bg-[#f8fafc] text-slate-400 font-bold">
                        Connecting to room...
                    </div>
                ) : (
                    <Tldraw
                        store={storeWithStatus.store}
                        hideUi={true}
                        onMount={(editor) => setEditor(editor)}
                        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
                    />
                )}
            </div>

            {/* Top Bar */}
            <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-start z-50 pointer-events-none">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pointer-events-auto flex items-center gap-4 bg-white px-5 py-3 rounded-full shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <Link href="/dashboard" className="p-1 hover:bg-slate-50 rounded-full transition-colors active:scale-90 inline-block">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div className="flex flex-col">
                        {isEditingName ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={handleNameKeyDown}
                                    onBlur={handleNameSave}
                                    className="text-sm font-bold text-slate-900 leading-none bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 w-44 transition-all"
                                    maxLength={50}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditingName(true)}
                                className="text-sm font-bold text-slate-900 leading-none hover:text-teal-600 transition-colors cursor-text text-left"
                                title="Click to rename"
                            >
                                {boardName}
                            </button>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            ID: {roomId}
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="pointer-events-auto flex items-center gap-2 bg-white p-1.5 rounded-full shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="flex items-center gap-3 px-3">
                        <Link href="/settings">
                            <div className="w-8 h-8 rounded-full border-2 border-teal-200 bg-gradient-to-br from-teal-500 to-lime-400 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
                                YOU
                            </div>
                        </Link>
                        <div className="h-6 w-px bg-slate-100" />
                        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600">
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ← SHARE BUTTON wired up */}
                    <button
                        onClick={() => setShareOpen(true)}
                        className="bg-gradient-to-r from-teal-500 to-lime-400 text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:opacity-90"
                    >
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                </motion.div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-between items-end z-50 pointer-events-none">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="pointer-events-auto flex items-center gap-4 bg-white px-5 py-3 rounded-full shadow-xl border border-slate-100"
                >
                    <span className="text-sm font-bold text-slate-900 w-10 text-center">{zoom}%</span>
                    <div className="h-4 w-px bg-slate-100" />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => editor?.undo()}
                            disabled={!canUndo}
                            className={cn("p-1.5 rounded-lg", canUndo ? "text-slate-600 hover:bg-slate-50" : "text-slate-200")}
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => editor?.redo()}
                            disabled={!canRedo}
                            className={cn("p-1.5 rounded-lg", canRedo ? "text-slate-600 hover:bg-slate-50" : "text-slate-200")}
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="pointer-events-auto flex items-center gap-1 bg-white p-2 rounded-full shadow-2xl border border-slate-100"
                >
                    <button onClick={() => selectTool("select")} className={cn("p-3 rounded-full transition-all", activeTool === "select" ? activeClass : inactiveClass)}>
                        <MousePointer2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => selectTool("draw")} className={cn("p-3 rounded-full transition-all", activeTool === "draw" ? activeClass : inactiveClass)}>
                        <Pencil className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-6 gap-1.5 px-3 mx-1 border-x border-slate-100">
                        {Object.entries(COLOR_MAP).map(([name, hex]) => (
                            <button
                                key={name}
                                onClick={() => changeColor(name.replace(/[A-Z]/g, m => "-" + m.toLowerCase()))}
                                className={cn(
                                    "w-4 h-4 rounded-full border border-slate-200 transition-all hover:scale-125",
                                    activeColor === name.replace(/[A-Z]/g, m => "-" + m.toLowerCase())
                                        ? "ring-2 ring-teal-400 ring-offset-1 scale-110"
                                        : ""
                                )}
                                style={{ backgroundColor: hex }}
                            />
                        ))}
                    </div>

                    <button onClick={() => selectTool("geo")} className={cn("p-3 rounded-full transition-all", activeTool === "geo" ? activeClass : inactiveClass)}>
                        <Square className="w-5 h-5" />
                    </button>
                    <button onClick={() => selectTool("text")} className={cn("p-3 rounded-full transition-all", activeTool === "text" ? activeClass : inactiveClass)}>
                        <Type className="w-5 h-5" />
                    </button>

                    <div className="h-6 w-px bg-slate-100 mx-1" />

                    <button
                        onClick={() => selectTool("note")}
                        className={cn("p-3 rounded-full transition-all flex items-center justify-center", activeTool === "note" ? activeClass : "text-orange-500 hover:bg-orange-50")}
                        title="Add Sticky Note"
                    >
                        <Plus className={cn("w-6 h-6 transition-transform", activeTool === "note" ? "rotate-45" : "rotate-0")} />
                    </button>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="pointer-events-auto"
                >
                    <button
                        onClick={clearCanvas}
                        className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-xl border border-slate-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90"
                    >
                        <Trash2 className="w-6 h-6" />
                    </button>
                </motion.div>
            </div>
        </div>
    );
}