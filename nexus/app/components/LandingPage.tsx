"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
    ArrowRight, Mic, Video, PhoneOff, Hand, Square, StickyNote,
    Shapes, Image as ImageIcon, Bolt, RefreshCw, Menu, MousePointer2, LayoutDashboard
} from "lucide-react";

// --- Components ---

// 1. Accept session as a prop
const Navbar = ({ session }: { session: any }) => {

    // REMOVED: authClient.useSession()
    // REMOVED: mounted state and useEffect()

    return (
        <nav className="fixed top-0 w-full flex justify-between items-center px-8 py-4 max-w-[1440px] left-1/2 -translate-x-1/2 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
            <div className="flex items-center gap-12">
                <Link
                    href="/"
                    className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-50 hover:opacity-80 transition-opacity"
                >
                    Nexus
                </Link>
                <div className="hidden md:flex items-center gap-8">
                    <a className="text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight" href="#features">
                        Features
                    </a>
                    <a className="text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight" href="#how-it-works">
                        How it Works
                    </a>
                </div>
            </div>
            <div className="flex items-center gap-4">

                {/* --- DYNAMIC AUTH LOGIC (NOW FLICKER-FREE) --- */}
                {/* 2. Simply check if session exists. No loading states needed. */}
                {session ? (
                    <Link href="/dashboard" className="flex items-center gap-3 hover:bg-slate-100 p-1.5 pr-4 rounded-full transition-colors border border-outline/20">
                        <img
                            src={session.user.image || `https://ui-avatars.com/api/?name=${session.user.name}&background=random`}
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover bg-slate-200"
                            referrerPolicy="no-referrer"
                        />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 hidden sm:block">
                            {session.user.name}
                        </span>
                    </Link>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link className="hidden lg:block text-slate-600 font-medium text-sm px-4 py-2 hover:text-slate-900 transition-colors" href="/login">Log in</Link>
                        <Link href="/register" className="brand-gradient text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 brand-gradient-hover transition-all transform active:scale-95 text-center inline-block">
                            Sign Up
                        </Link>
                    </div>
                )}
                {/* ------------------------------------- */}

                <Menu className="md:hidden text-on-surface p-2 cursor-pointer" />
            </div>
        </nav>
    );
};

// ... keep Hero, WhiteboardPreview, Features, CTA, and Footer exactly as they are ...

const Hero = () => {
    return (
        <section className="max-w-7xl mx-auto px-8 lg:flex items-center gap-16 relative pt-32">
            <div className="lg:w-1/2 space-y-8 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 bg-secondary-container/30 px-4 py-1.5 rounded-full border border-secondary-fixed-dim/20"
                >
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="text-secondary font-bold text-[0.6875rem] tracking-wider uppercase">New: Crystal Clear Voice Chat</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl lg:text-7xl font-black text-on-background tracking-tighter leading-[1.05]"
                >
                    Nexus: The Collaborative Whiteboard with <span className="text-primary italic">Built-in</span> Real-time Voice.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg lg:text-xl text-on-surface-variant leading-relaxed max-w-xl"
                >
                    Define ideas, align on decisions, and talk effortlessly—all in one unified workspace. Nexus combines frictionless whiteboard collaboration with native high-fidelity audio.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4 pt-4"
                >
                    <Link href="/dashboard" className="w-full sm:w-auto brand-gradient text-white px-10 py-5 rounded-full text-lg font-bold shadow-xl shadow-primary/25 hover:shadow-2xl transition-all transform hover:-translate-y-1 text-center inline-block">
                        Open Dashboard
                    </Link>
                    <Link href="/dashboard" className="w-full sm:w-auto border-2 border-outline px-10 py-5 rounded-full text-lg font-bold text-on-surface hover:bg-surface-container-low transition-all text-center inline-block">
                        Start Drawing
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-4 pt-8"
                >
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map((i) => (
                            <img
                                key={i}
                                alt={`Team member avatar ${i}`}
                                className="w-10 h-10 rounded-full border-2 border-white object-cover"
                                src={`https://picsum.photos/seed/user${i}/100/100`}
                                referrerPolicy="no-referrer"
                            />
                        ))}
                    </div>
                    <span className="text-sm font-medium text-on-surface-variant">Trusted by 2,000+ creative teams worldwide</span>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="lg:w-1/2 mt-16 lg:mt-0 relative h-[500px] lg:h-[650px] w-full"
            >
                <div className="absolute inset-0 bg-surface-container-low rounded-[3rem] overflow-hidden border border-outline-variant/10">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>

                    <div className="absolute top-12 left-12 w-32 h-32 bg-primary/10 rounded-3xl rotate-12 flex items-center justify-center">
                        <LayoutDashboard className="w-12 h-12 text-primary" />
                    </div>

                    <div className="absolute top-1/4 right-8 w-48 h-48 bg-secondary-container/40 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-tertiary-container/30 rounded-full blur-3xl"></div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-8">
                        <div className="glass-panel p-6 rounded-xl border border-white/40 shadow-2xl relative">
                            <div className="absolute -top-4 left-1/4 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-sm shadow-md flex items-center gap-1">
                                <MousePointer2 className="w-2.5 h-2.5" /> Sarah
                            </div>
                            <div className="absolute -bottom-2 right-1/3 bg-[#E91E63] text-white text-[10px] px-2 py-1 rounded-sm shadow-md flex items-center gap-1">
                                <MousePointer2 className="w-2.5 h-2.5" /> Marcus
                            </div>

                            <div className="space-y-4">
                                <div className="h-4 w-1/2 bg-slate-200 rounded-full"></div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="aspect-square bg-primary-container/40 rounded-lg flex items-center justify-center">
                                        <Bolt className="text-primary" />
                                    </div>
                                    <div className="aspect-square bg-secondary-container/40 rounded-lg flex items-center justify-center">
                                        <Shapes className="text-secondary" />
                                    </div>
                                    <div className="aspect-square bg-tertiary-container/40 rounded-lg flex items-center justify-center">
                                        <StickyNote className="text-tertiary" />
                                    </div>
                                </div>
                                <div className="h-12 w-full bg-slate-100 rounded-lg border border-dashed border-slate-300"></div>
                            </div>

                            <div className="absolute -right-4 top-1/4 bg-white p-3 rounded-2xl shadow-xl flex flex-col gap-3 border border-slate-100">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-primary-container/30">
                                    <Mic className="w-5 h-5" />
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Video className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

const WhiteboardPreview = () => {
    return (
        <section className="max-w-6xl mx-auto px-8 -mt-12 mb-32 relative" id="how-it-works">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-surface-container-lowest rounded-[2.5rem] p-4 shadow-2xl border border-outline-variant/20 overflow-hidden"
            >
                <div className="bg-slate-50 rounded-[2rem] h-[600px] w-full relative overflow-hidden group">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 z-20">
                        <button className="p-2 hover:bg-slate-100 rounded-full text-primary"><Hand className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-full"><Square className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-full text-secondary"><Bolt className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-full"><StickyNote className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-full"><Shapes className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-full"><ImageIcon className="w-5 h-5" /></button>
                    </div>

                    <div className="p-16 h-full flex flex-col items-center justify-center text-center space-y-8 relative">
                        <img
                            alt="Collaborative session in progress"
                            className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity"
                            src="https://picsum.photos/seed/whiteboard/1200/800"
                            referrerPolicy="no-referrer"
                        />
                        <div className="relative z-10 space-y-4">
                            <h2 className="text-3xl font-bold text-on-surface">Experience Infinite Flow</h2>
                            <p className="text-on-surface-variant max-w-md mx-auto">One canvas for your entire team. Built on the speed of light.</p>
                            <Link href="/login" className="bg-primary text-white px-8 py-3 rounded-full font-bold inline-flex items-center gap-2 shadow-lg shadow-primary/20">
                                Open Dashboard <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-20">
                        <div className="flex gap-2">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 overflow-hidden relative border-2 border-white shadow-lg">
                                <img alt="Caller 1" src="https://picsum.photos/seed/caller1/100/100" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 overflow-hidden relative border-2 border-white shadow-lg">
                                <img alt="Caller 2" src="https://picsum.photos/seed/caller2/100/100" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                        </div>
                        <div className="bg-slate-900 px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl">
                            <div className="flex items-center gap-3 text-white border-r border-slate-700 pr-6">
                                <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center text-[10px] font-bold">M</div>
                                <span className="text-sm font-medium">Live Voice Chat</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="p-2 text-white hover:bg-slate-800 rounded-full"><Mic className="w-4 h-4" /></button>
                                <button className="p-2 text-white hover:bg-slate-800 rounded-full"><Video className="w-4 h-4" /></button>
                                <button className="p-2 bg-red-500 text-white rounded-full"><PhoneOff className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

const Features = () => {
    return (
        <section className="max-w-7xl mx-auto px-8 py-24" id="features">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-on-background">Designed for how you think.</h2>
                <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">Simple tools, deep capabilities. Everything you need to go from spark to finish.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 bg-surface-container-low rounded-xl p-10 flex flex-col justify-between group overflow-hidden relative min-h-[350px]">
                    <div className="z-10">
                        <h3 className="text-3xl font-bold mb-4">Voice-Integrated Canvasing</h3>
                        <p className="text-on-surface-variant max-w-md">No more tab-switching. Use high-fidelity native audio inside your whiteboard to keep the momentum going.</p>
                    </div>
                    <img
                        alt="Voice collaboration visual"
                        className="absolute bottom-0 right-0 w-2/3 h-1/2 object-cover rounded-tl-3xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
                        src="https://picsum.photos/seed/voice/600/400"
                        referrerPolicy="no-referrer"
                    />
                </div>

                <div className="md:col-span-4 bg-primary text-on-primary rounded-xl p-10 flex flex-col justify-center text-center space-y-6">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                        <Bolt className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold">1ms Latency</h3>
                    <p className="opacity-80">Built on a custom real-time engine that ensures every stroke is seen by everyone, instantly.</p>
                </div>

                <div className="md:col-span-4 bg-secondary-container rounded-xl p-10 flex flex-col justify-between group min-h-[300px]">
                    <h3 className="text-2xl font-bold text-on-secondary-container">Asset Library</h3>
                    <p className="text-on-secondary-container/80">Import logos, Figma files, and photos with a simple drag-and-drop.</p>
                    <div className="flex gap-2 mt-8">
                        <div className="w-12 h-12 bg-white rounded-lg shadow-sm"></div>
                        <div className="w-12 h-12 bg-white rounded-lg shadow-sm translate-y-2"></div>
                        <div className="w-12 h-12 bg-white rounded-lg shadow-sm"></div>
                    </div>
                </div>

                <div className="md:col-span-8 bg-surface-container-high rounded-xl p-10 flex items-center gap-12 overflow-hidden relative min-h-[300px]">
                    <div className="w-1/2">
                        <h3 className="text-3xl font-bold mb-4">Cloud Synced</h3>
                        <p className="text-on-surface-variant">Your boards are instantly saved to the cloud using MongoDB, so you never lose your brainstorming sessions.</p>
                    </div>
                    <div className="w-1/2 flex justify-end">
                        <RefreshCw className="w-32 h-32 opacity-10 rotate-12" />
                    </div>
                </div>
            </div>
        </section>
    );
};

const CTA = () => {
    return (
        <section className="max-w-7xl mx-auto px-8 py-24">
            <div className="brand-gradient rounded-3xl p-16 text-center text-white space-y-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>
                <h2 className="text-4xl lg:text-6xl font-black tracking-tighter relative z-10">Start building the future of work today.</h2>
                <p className="text-xl opacity-90 max-w-2xl mx-auto relative z-10">Join 50,000+ companies using Nexus to bridge the gap between imagination and execution.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                    <Link href="/dashboard" className="bg-white text-primary px-10 py-5 rounded-full text-lg font-bold hover:bg-slate-50 transition-all shadow-xl text-center inline-block">
                        Open Dashboard
                    </Link>
                    <Link href="/dashboard" className="bg-black/20 backdrop-blur-md text-white border border-white/30 px-10 py-5 rounded-full text-lg font-bold hover:bg-black/30 transition-all text-center inline-block">
                        Start Drawing
                    </Link>
                </div>
            </div>
        </section>
    );
};

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-slate-900 py-12 px-8 border-t border-slate-100">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <span className="text-sm text-slate-500 dark:text-slate-400">© 2026 Nexus App. Developed for [University Of Okara].</span>
                <div className="flex items-center gap-6">
                </div>
            </div>
        </footer>
    );
};

// 3. Accept session from the Server Component
export default function LandingPage({ session }: { session: any }) {
    return (
        <main className="min-h-screen">
            {/* 4. Pass session into the Navbar */}
            <Navbar session={session} />
            <Hero />
            <WhiteboardPreview />
            <Features />
            <CTA />
            <Footer />
        </main>
    );
}