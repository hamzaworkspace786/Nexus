"use client";

import React from "react";
import Link from "next/link";
import {
    Plus,
    Bell,
    HelpCircle,
    Search,
    Filter,
} from "lucide-react";

export default function DashboardPage() {
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
                        <Link href="#" className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-medium tracking-tight px-3 py-1 rounded-full">
                            Whiteboard
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-teal-600 to-lime-500 hover:from-teal-500 hover:to-lime-400 text-slate-950 px-6 py-2 rounded-full font-bold active:scale-95 transition-all duration-200 shadow-lg shadow-teal-900/20">
                        <Plus className="w-4 h-4" />
                        New Board
                    </button>

                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-full transition-all active:scale-95">
                            <Bell className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-full transition-all active:scale-95">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-slate-800 ml-2 cursor-pointer active:scale-95 transition-all hover:border-teal-500">
                        <img alt="User Profile" className="h-full w-full object-cover" src="https://picsum.photos/seed/profile/100/100" />
                    </div>
                </div>
            </nav>

            {/* Main Dashboard Content */}
            <main className="pt-24 pb-16 px-8 max-w-7xl mx-auto w-full flex-grow">

                {/* Header Section */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-teal-500 mb-2 block">Workspace Overview</span>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Recent Projects</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                className="bg-slate-900/50 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl pl-12 pr-4 py-3 w-64 text-sm text-slate-200 placeholder:text-slate-500 transition-all outline-none"
                                placeholder="Search boards..."
                                type="text"
                            />
                        </div>
                        <button className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Bento Grid Layout - Empty State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

                    {/* Create New Board Card */}
                    <button className="group relative flex flex-col items-center justify-center h-[280px] bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/10 hover:scale-[1.02] hover:border-teal-500/50 hover:bg-slate-900/50 focus:outline-none">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-teal-600 group-hover:to-lime-500 group-hover:text-slate-950 text-slate-400 transition-all duration-300 shadow-inner">
                            <Plus className="w-8 h-8" />
                        </div>
                        <span className="mt-4 font-bold text-lg text-slate-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-400 group-hover:to-lime-400 transition-all">
                            Create New Board
                        </span>
                        <span className="mt-1 text-sm text-slate-500 group-hover:text-slate-400 transition-colors">Start from a blank canvas</span>
                    </button>

                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-8 border-t border-slate-900 bg-slate-950 flex flex-col items-center gap-4 mt-auto">
                <div className="flex gap-8">
                    <Link href="#" className="text-[0.6875rem] uppercase tracking-wider text-slate-500 hover:text-teal-400 underline-offset-4 hover:underline transition-colors">Privacy Policy</Link>
                    <Link href="#" className="text-[0.6875rem] uppercase tracking-wider text-slate-500 hover:text-teal-400 underline-offset-4 hover:underline transition-colors">Terms of Service</Link>
                    <Link href="#" className="text-[0.6875rem] uppercase tracking-wider text-slate-500 hover:text-teal-400 underline-offset-4 hover:underline transition-colors">Support</Link>
                </div>
                <p className="text-[0.6875rem] uppercase tracking-wider text-slate-600">© 2026 Nexus Collaborative. All rights reserved.</p>
            </footer>

            {/* Mobile Floating Action Button */}
            <button className="fixed bottom-8 right-8 bg-gradient-to-r from-teal-600 to-lime-500 text-slate-950 w-14 h-14 rounded-full shadow-lg shadow-teal-900/20 flex items-center justify-center active:scale-95 transition-all md:hidden">
                <Plus className="w-8 h-8" />
            </button>

        </div>
    );
}