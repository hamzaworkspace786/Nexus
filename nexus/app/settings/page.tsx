"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
    User, Search,
    Eye, EyeOff, Check, X, LogOut,
    Globe, Search as SearchIcon,
    LayoutDashboard, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
type Tab = "personal";

// ─── Search Helper ────────────────────────────────────────
function matches(query: string, ...texts: (string | undefined)[]) {
    if (!query) return true;
    const q = query.toLowerCase();
    return texts.some(t => t?.toLowerCase().includes(q));
}

// ─── Reusable toggle switch ────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? "bg-gradient-to-r from-teal-500 to-lime-400" : "bg-slate-700"}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    );
}

// ─── Section header ────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
    );
}

// ─── Input field ───────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, disabled = false, hint }: {
    label: string; type?: string; value: string; onChange?: (v: string) => void;
    placeholder?: string; disabled?: boolean; hint?: string;
}) {
    const [show, setShow] = useState(false);
    const isPassword = type === "password";
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">{label}</label>
            <div className="relative">
                <input
                    type={isPassword ? (show ? "text" : "password") : type}
                    value={value}
                    onChange={e => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {isPassword && (
                    <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
    );
}

// ─── Card wrapper ──────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 backdrop-blur-sm ${className}`}>
            {children}
        </div>
    );
}

// ─── Save button ───────────────────────────────────────────
function SaveButton({ onClick, loading, saved }: { onClick: () => void; loading: boolean; saved: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-lime-400 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-teal-500/20 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {loading ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
    );
}

// ══════════════════════════════════════════════════════════
// TAB: PERSONAL INFO
// ══════════════════════════════════════════════════════════
function PersonalInfo({ session, search = "" }: { session: any; search?: string }) {
    const [name, setName] = useState(session?.user?.name || "");
    const [email] = useState(session?.user?.email || "");
    const [bio, setBio] = useState(session?.user?.bio || "");
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/user/update-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, bio }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            // Refresh the session to show updated data globally
            await authClient.getSession();

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (error) {
            console.error(error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const showHeader = !search;

    return (
        <div className="space-y-6">
            {showHeader && <SectionHeader title="Personal Info" subtitle="Update your profile and personal details." />}

            {/* Avatar */}
            {matches(search, "Profile Photo", "Avatar", "Photo", "Image", session?.user?.name, session?.user?.email) && (
                <Card>
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Profile Photo</h2>
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-500 to-lime-400 p-0.5">
                                <div className="h-full w-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center">
                                    {session?.user?.image
                                        ? <img src={session.user.image} alt={`${session.user.name || "User"}'s avatar`} className="h-full w-full object-cover" />
                                        : <span className="text-2xl font-bold text-white">{(session?.user?.name || "U")[0].toUpperCase()}</span>
                                    }
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">{session?.user?.name || "Your Name"}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{session?.user?.email}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Fields */}
            {matches(search, "Basic Information", "Full Name", "Email Address", "Bio", "Profile") && (
                <Card>
                    <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">Basic Information</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Full Name" value={name} onChange={setName} placeholder="Your full name" />
                            <Field label="Email Address" value={email} disabled hint="Email cannot be changed." />
                        </div>
                        <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell people a little about yourself…" />
                    </div>
                </Card>
            )}

            {!search && (
                <div className="flex justify-end">
                    <SaveButton onClick={handleSave} loading={loading} saved={saved} />
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ══════════════════════════════════════════════════════════
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("personal");
    const [search, setSearch] = useState("");
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    if (isPending) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            </div>
        );
    }

    const navItems = [
        { id: "personal" as Tab, label: "Personal Info", icon: User },
    ];

    return (
        <div className="min-h-screen bg-slate-950 font-sans">

            {/* ── TOP NAVBAR ──────────────────────────────────── */}
            <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-6 px-6">
                    {/* Logo */}
                    <Link href="/" className="text-2xl font-black bg-gradient-to-r from-teal-400 to-lime-400 bg-clip-text text-transparent">
                        Nexus
                    </Link>

                    {/* Nav links */}
                    <nav className="flex items-center gap-1 ml-2">
                        <Link href="/dashboard" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all">
                            <LayoutDashboard size={14} /> Whiteboard
                        </Link>
                        <Link href="/dashboard" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all">
                            <Globe size={14} /> Projects
                        </Link>
                    </nav>

                    {/* Search */}
                    <div className="flex-1 max-w-xs ml-auto">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search settings…"
                                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 py-2 pl-9 pr-4 text-sm text-slate-300 placeholder-slate-500 outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* Right icons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab("personal")}
                            className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-lime-400 p-0.5 overflow-hidden hover:opacity-90 transition-opacity"
                        >
                            <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                {session?.user?.image
                                    ? <img src={session.user.image} alt={`${session.user.name || "User"}'s avatar`} className="h-full w-full object-cover" />
                                    : <span className="text-xs font-bold text-white">{(session?.user?.name || "U")[0].toUpperCase()}</span>
                                }
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── BODY ────────────────────────────────────────── */}
            <div className="mx-auto flex max-w-screen-xl">

                {/* ── LEFT SIDEBAR ──────────────────────────── */}
                <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-slate-800/60 pt-8 pb-6 flex flex-col justify-between">
                    <div>
                        <div className="px-5 mb-6">
                            <p className="text-base font-bold text-white">Settings</p>
                            <p className="text-xs text-slate-500 mt-0.5">Manage your experience</p>
                        </div>
                        <nav className="flex flex-col gap-0.5 px-3">
                            {navItems.map(({ id, label, icon: Icon }) => {
                                const isActive = activeTab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setActiveTab(id)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left
                                            ${isActive
                                                ? "bg-gradient-to-r from-teal-500 to-lime-400 text-slate-900 shadow-lg shadow-teal-500/20"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                            }`}
                                    >
                                        <Icon size={15} className={isActive ? "text-slate-900" : ""} />
                                        {label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Sign out at bottom */}
                    <div className="px-3">
                        <button
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                        >
                            <LogOut size={15} />
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ──────────────────────────── */}
                <main className="flex-1 px-10 py-10 min-h-[calc(100vh-3.5rem)]">
                    {search ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-2xl font-bold text-white">Search Results</h1>
                                <p className="mt-1 text-sm text-slate-400">Showing all settings matching &quot;{search}&quot;</p>
                            </div>

                            <PersonalInfo session={session} search={search} />

                            {/* Verification if anything shown */}
                            <EmptySearchCheck search={search} session={session} />
                        </div>
                    ) : (
                        <>
                            {activeTab === "personal" && <PersonalInfo session={session} />}
                        </>
                    )}
                </main>
            </div>

            <footer className="border-t border-slate-800/60 py-6 text-center">
                <p className="text-xs text-slate-600 uppercase tracking-widest">© 2026 Nexus Collaborative. All rights reserved.</p>
            </footer>
        </div>
    );
}

// ─── Helper for empty state ──────────────────────────────
function EmptySearchCheck({ search, session }: { search: string; session: any }) {
    // Determine if any matches exist across all categories
    const hasPersonal = matches(search, "Profile Photo", "Avatar", "Photo", "Image", session?.user?.name, session?.user?.email) ||
        matches(search, "Basic Information", "Full Name", "Email Address", "Bio", "Profile");

    if (!hasPersonal) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 border border-slate-800 mb-6">
                    <SearchIcon className="h-10 w-10 text-slate-700" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No settings found</h2>
                <p className="text-slate-400 max-w-xs mx-auto">
                    We couldn&apos;t find any settings matching &quot;{search}&quot;. Try another search term.
                </p>
            </div>
        );
    }

    return null;
}
