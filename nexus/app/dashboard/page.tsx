"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Plus,
    Bell,
    HelpCircle,
    Search,
    Filter,
    LayoutDashboard,
    Clock,
    Loader2,
    X,
    Rocket,
    Zap,
    Users,
    ChevronRight,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { createBoardInDb, getUserBoards } from "@/app/actions/boardActions";

type Board = {
    _id: string;
    roomId: string;
    name: string;
    ownerId: string;
    createdAt: string;
};

export default function DashboardPage() {
    const router = useRouter();
    const { data: session } = useSession();

    const [boards, setBoards] = useState<Board[]>([]);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Fetch all boards on mount
    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        setIsLoadingBoards(true);
        try {
            const data = await getUserBoards();
            setBoards(data || []);
        } catch (error) {
            console.error("Failed to fetch boards:", error);
        } finally {
            setIsLoadingBoards(false);
        }
    };

    // Filter boards by search query
    const filteredBoards = useMemo(() => {
        if (!searchQuery.trim()) return boards;
        const q = searchQuery.toLowerCase();
        return boards.filter(
            (board) =>
                board.name.toLowerCase().includes(q) ||
                board.roomId.toLowerCase().includes(q)
        );
    }, [boards, searchQuery]);

    const handleCreateBoard = async () => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            const newBoardId = Math.random().toString(36).substring(2, 10);
            await createBoardInDb(newBoardId);
            router.push(`/whiteboard/${newBoardId}`);
        } catch (error) {
            console.error("Failed to create board:", error);
            alert("Something went wrong creating your board. Please try again.");
            setIsCreating(false);
        }
    };

    // Format relative time (e.g. "2 hours ago", "3 days ago")
    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffSec < 60) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex flex-col">

            {/* TopNavBar Shell */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 flex justify-between items-center px-8 h-16">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-2xl font-black bg-gradient-to-r from-teal-400 to-lime-400 bg-clip-text text-transparent">
                        Nexus
                    </Link>
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/dashboard" className="text-teal-400 font-bold border-b-2 border-teal-500 tracking-tight h-16 flex items-center">
                            Projects
                        </Link>
                        <button onClick={handleCreateBoard} className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-medium tracking-tight px-3 py-1 rounded-full">
                            Whiteboard
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCreateBoard}
                        disabled={isCreating}
                        className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-teal-600 to-lime-500 hover:from-teal-500 hover:to-lime-400 text-slate-950 px-6 py-2 rounded-full font-bold active:scale-95 transition-all duration-200 shadow-lg shadow-teal-900/20 disabled:opacity-70 disabled:active:scale-100"
                    >
                        {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        New Board
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-full transition-all active:scale-95"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-slate-800 ml-2 cursor-pointer active:scale-95 transition-all hover:border-teal-500">
                        <Link href="/settings">
                            <img
                                alt={session?.user?.name || "User Profile"}
                                className="h-full w-full object-cover"
                                src={session?.user?.image || `https://ui-avatars.com/api/?name=${session?.user?.name || 'User'}&background=0D8B93&color=fff`}
                                referrerPolicy="no-referrer"
                            />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Dashboard Content */}
            <main className="pt-24 pb-16 px-8 max-w-7xl mx-auto w-full flex-grow">

                {/* Header Section */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-teal-500 mb-2 block">Workspace Overview</span>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                            Welcome, {session?.user?.name?.split(" ")[0] || "Creator"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                className="bg-slate-900/50 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl pl-12 pr-4 py-3 w-64 text-sm text-slate-200 placeholder:text-slate-500 transition-all outline-none"
                                placeholder="Search boards..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                {/* Board Count */}
                {!isLoadingBoards && (
                    <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>
                            {filteredBoards.length} {filteredBoards.length === 1 ? "board" : "boards"}
                            {searchQuery && ` matching "${searchQuery}"`}
                        </span>
                    </div>
                )}

                {/* Board Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                    {/* Create New Board Card */}
                    <button
                        onClick={handleCreateBoard}
                        disabled={isCreating}
                        className="group relative flex flex-col items-center justify-center h-[280px] bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/10 hover:scale-[1.02] hover:border-teal-500/50 hover:bg-slate-900/50 focus:outline-none disabled:opacity-60 disabled:hover:scale-100"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-teal-600 group-hover:to-lime-500 group-hover:text-slate-950 text-slate-400 transition-all duration-300 shadow-inner">
                            {isCreating ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                                <Plus className="w-8 h-8" />
                            )}
                        </div>
                        <span className="mt-4 font-bold text-lg text-slate-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-400 group-hover:to-lime-400 transition-all">
                            Create New Board
                        </span>
                        <span className="mt-1 text-sm text-slate-500 group-hover:text-slate-400 transition-colors">Start from a blank canvas</span>
                    </button>

                    {/* Loading Skeletons */}
                    {isLoadingBoards && (
                        <>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-[280px] bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col justify-between animate-pulse">
                                    <div className="space-y-3">
                                        <div className="h-4 bg-slate-800 rounded-lg w-3/4" />
                                        <div className="h-3 bg-slate-800/60 rounded-lg w-1/2" />
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="h-3 bg-slate-800/40 rounded-lg w-1/3" />
                                        <div className="h-8 w-8 bg-slate-800 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Existing Board Cards */}
                    {!isLoadingBoards && filteredBoards.map((board) => (
                        <Link
                            key={board._id}
                            href={`/whiteboard/${board.roomId}`}
                            className="group relative flex flex-col justify-between h-[280px] bg-slate-900/40 border border-slate-800 rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/10 hover:scale-[1.02] hover:border-teal-500/40 hover:bg-slate-900/60 focus:outline-none overflow-hidden"
                        >
                            {/* Decorative gradient blob on hover */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-lime-400/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-y-8 translate-x-8" />

                            {/* Top section */}
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4 group-hover:from-teal-600/20 group-hover:to-lime-500/10 group-hover:border-teal-500/30 transition-all duration-300">
                                    <LayoutDashboard className="w-5 h-5 text-slate-500 group-hover:text-teal-400 transition-colors duration-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
                                    {board.name}
                                </h3>
                                <p className="text-xs font-mono text-slate-600 mt-1.5 group-hover:text-slate-500 transition-colors">
                                    {board.roomId}
                                </p>
                            </div>

                            {/* Bottom section */}
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{formatRelativeTime(board.createdAt)}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-600 group-hover:text-teal-400 transition-colors uppercase tracking-wider">
                                    Open →
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Empty state when search yields no results */}
                {!isLoadingBoards && boards.length > 0 && filteredBoards.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Search className="w-12 h-12 text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-400 mb-1">No boards found</h3>
                        <p className="text-sm text-slate-600">No boards match &ldquo;{searchQuery}&rdquo;. Try a different search.</p>
                    </div>
                )}

            </main>

            {/* Footer */}
            <footer className="w-full py-8 border-t border-slate-900 bg-slate-950 flex flex-col items-center gap-4 mt-auto">
                <p className="text-[0.6875rem] uppercase tracking-wider text-slate-600">© 2026 Nexus Collaborative. All rights reserved.</p>
            </footer>

            {/* Mobile Floating Action Button */}
            <button
                onClick={handleCreateBoard}
                disabled={isCreating}
                className="fixed bottom-8 right-8 bg-gradient-to-r from-teal-600 to-lime-500 text-slate-950 w-14 h-14 rounded-full shadow-lg shadow-teal-900/20 flex items-center justify-center active:scale-95 transition-all md:hidden disabled:opacity-70"
            >
                {isCreating ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                    <Plus className="w-8 h-8" />
                )}
            </button>

            {/* Help Modal */}
            {isHelpOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setIsHelpOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-slate-900/90 border border-slate-700/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-gradient-to-br from-slate-900 to-slate-950">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                    <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400">
                                        <Rocket className="w-6 h-6" />
                                    </div>
                                    Welcome to Nexus
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Your collaborative creative workspace</p>
                            </div>
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* Feature 1 */}
                            <div className="flex gap-5 group">
                                <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center border border-teal-500/20 group-hover:border-teal-500/40 transition-colors">
                                    <Plus className="w-6 h-6 text-teal-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Create New Boards</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        Click the <strong className="text-teal-400">New Board</strong> button or the dashed card in your grid to start a fresh canvas. Every board has a unique ID you can share.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="flex gap-5 group">
                                <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-500/20 to-lime-500/5 flex items-center justify-center border border-lime-500/20 group-hover:border-lime-500/40 transition-colors">
                                    <Search className="w-6 h-6 text-lime-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Organize Your Work</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        Use the search bar at the top to filter through your projects. Nexus automatically saves your progress so you can pick up exactly where you left off.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="flex gap-5 group">
                                <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-lime-500/5 flex items-center justify-center border border-teal-500/20 group-hover:border-lime-500/40 transition-colors">
                                    <Users className="w-6 h-6 text-teal-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Real-time Collaboration</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        Invite team members to your board. Multiple people can draw, write, and ideate simultaneously with zero lag.
                                    </p>
                                </div>
                            </div>

                            {/* Beginner Tip */}
                            <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10 flex items-start gap-4">
                                <Zap className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-teal-300/80 italic leading-relaxed">
                                    <strong className="text-teal-400 not-italic">Pro Tip:</strong> You can rename your boards directly from the whiteboard view to keep your workspace tidy!
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-900 border-t border-slate-800/50 flex justify-end">
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="bg-gradient-to-r from-teal-600 to-lime-500 hover:from-teal-500 hover:to-lime-400 text-slate-950 px-8 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-teal-900/20"
                            >
                                Got it, let's go!
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}