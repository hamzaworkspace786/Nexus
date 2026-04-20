"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
    User, Lock, Bell, Puzzle, Search, ChevronRight,
    Camera, Eye, EyeOff, Check, X, LogOut,
    Shield, Smartphone, Globe, Mail, AlertCircle,
    LayoutDashboard, Pencil, HelpCircle, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
type Tab = "personal" | "security" | "notifications" | "integrations";

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
function PersonalInfo({ session }: { session: any }) {
    const [name, setName] = useState(session?.user?.name || "");
    const [email] = useState(session?.user?.email || "");
    const [bio, setBio] = useState("");
    const [website, setWebsite] = useState("");
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 900));
        setLoading(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="Personal Info" subtitle="Update your profile and personal details." />

            {/* Avatar */}
            <Card>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Profile Photo</h2>
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-500 to-lime-400 p-0.5">
                            <div className="h-full w-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center">
                                {session?.user?.image
                                    ? <img src={session.user.image} alt="avatar" className="h-full w-full object-cover" />
                                    : <span className="text-2xl font-bold text-white">{(session?.user?.name || "U")[0].toUpperCase()}</span>
                                }
                            </div>
                        </div>
                        <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg hover:bg-teal-400 transition-colors">
                            <Camera size={13} />
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{session?.user?.name || "Your Name"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{session?.user?.email}</p>
                        <button className="mt-2 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors">
                            Upload new photo
                        </button>
                    </div>
                </div>
            </Card>

            {/* Fields */}
            <Card>
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">Basic Information</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Full Name" value={name} onChange={setName} placeholder="Your full name" />
                        <Field label="Email Address" value={email} disabled hint="Email cannot be changed." />
                    </div>
                    <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell people a little about yourself…" />
                    <Field label="Website" value={website} onChange={setWebsite} placeholder="https://yourwebsite.com" />
                </div>
            </Card>

            {/* Danger zone */}
            <Card>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-red-400">Danger Zone</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white">Delete Account</p>
                        <p className="text-xs text-slate-400 mt-0.5">Permanently delete your account and all your boards.</p>
                    </div>
                    <button className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                        Delete Account
                    </button>
                </div>
            </Card>

            <div className="flex justify-end">
                <SaveButton onClick={handleSave} loading={loading} saved={saved} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB: SECURITY
// ══════════════════════════════════════════════════════════
function Security() {
    const [current, setCurrent] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [twoFactor, setTwoFactor] = useState(false);

    const match = newPass && confirm && newPass === confirm;
    const mismatch = newPass && confirm && newPass !== confirm;

    const handleSave = async () => {
        if (!match) return;
        setLoading(true);
        await new Promise(r => setTimeout(r, 900));
        setLoading(false);
        setSaved(true);
        setCurrent(""); setNewPass(""); setConfirm("");
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="Security" subtitle="Manage your password and account security." />

            <Card>
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">Change Password</h2>
                <div className="space-y-4">
                    <Field label="Current Password" type="password" value={current} onChange={setCurrent} placeholder="Enter current password" />
                    <Field label="New Password" type="password" value={newPass} onChange={setNewPass} placeholder="Min. 8 characters"
                        hint="Use a mix of letters, numbers, and symbols." />
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Re-enter new password"
                                className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all bg-slate-800/60
                                    ${mismatch ? "border-red-500 focus:ring-2 focus:ring-red-500/20" : match ? "border-teal-500 focus:ring-2 focus:ring-teal-500/20" : "border-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"}`}
                            />
                            {match && <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400" />}
                            {mismatch && <X size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
                        </div>
                        {mismatch && <p className="text-xs text-red-400">Passwords do not match.</p>}
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Two-Factor Authentication</h2>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
                            <Smartphone size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Authenticator App</p>
                            <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security to your account.</p>
                        </div>
                    </div>
                    <Toggle enabled={twoFactor} onChange={setTwoFactor} />
                </div>
            </Card>

            <Card>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Active Sessions</h2>
                {[
                    { device: "Chrome on macOS", location: "Lahore, PK", current: true, time: "Active now" },
                    { device: "Safari on iPhone", location: "Lahore, PK", current: false, time: "2 hours ago" },
                ].map((s, i) => (
                    <div key={i} className={`flex items-center justify-between py-3 ${i !== 0 ? "border-t border-slate-700/50" : ""}`}>
                        <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${s.current ? "bg-teal-400" : "bg-slate-600"}`} />
                            <div>
                                <p className="text-sm font-medium text-white">{s.device}</p>
                                <p className="text-xs text-slate-400">{s.location} · {s.time}</p>
                            </div>
                        </div>
                        {!s.current && (
                            <button className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium">Revoke</button>
                        )}
                        {s.current && <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">This device</span>}
                    </div>
                ))}
            </Card>

            <div className="flex justify-end">
                <SaveButton onClick={handleSave} loading={loading} saved={saved} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB: NOTIFICATIONS
// ══════════════════════════════════════════════════════════
function Notifications() {
    const [prefs, setPrefs] = useState({
        boardInvites: true, boardComments: true, mentions: true,
        weeklyDigest: false, productUpdates: true, securityAlerts: true,
        emailNotifs: true, pushNotifs: false,
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

    const handleSave = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 900));
        setLoading(false); setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const groups = [
        {
            title: "Collaboration",
            items: [
                { key: "boardInvites", label: "Board Invites", desc: "When someone invites you to a board." },
                { key: "boardComments", label: "Board Comments", desc: "When someone comments on your board." },
                { key: "mentions", label: "Mentions", desc: "When someone mentions you in a comment." },
            ]
        },
        {
            title: "Updates",
            items: [
                { key: "weeklyDigest", label: "Weekly Digest", desc: "A summary of your activity every week." },
                { key: "productUpdates", label: "Product Updates", desc: "New features and improvements to Nexus." },
                { key: "securityAlerts", label: "Security Alerts", desc: "Important alerts about your account security." },
            ]
        },
        {
            title: "Channels",
            items: [
                { key: "emailNotifs", label: "Email Notifications", desc: "Receive notifications via email." },
                { key: "pushNotifs", label: "Push Notifications", desc: "Receive browser push notifications." },
            ]
        },
    ] as const;

    return (
        <div className="space-y-6">
            <SectionHeader title="Notifications" subtitle="Choose what you want to be notified about." />
            {groups.map(group => (
                <Card key={group.title}>
                    <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">{group.title}</h2>
                    <div className="space-y-0">
                        {group.items.map((item, i) => (
                            <div key={item.key} className={`flex items-center justify-between py-3.5 ${i !== 0 ? "border-t border-slate-700/50" : ""}`}>
                                <div>
                                    <p className="text-sm font-medium text-white">{item.label}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                                </div>
                                <Toggle enabled={prefs[item.key]} onChange={() => toggle(item.key)} />
                            </div>
                        ))}
                    </div>
                </Card>
            ))}
            <div className="flex justify-end">
                <SaveButton onClick={handleSave} loading={loading} saved={saved} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// TAB: INTEGRATIONS
// ══════════════════════════════════════════════════════════
function Integrations() {
    const [connected, setConnected] = useState<Record<string, boolean>>({
        google: false, notion: false, slack: false,
    });
    const [connecting, setConnecting] = useState<string | null>(null);

    const handleConnect = async (key: string) => {
        if (connected[key]) {
            setConnected(p => ({ ...p, [key]: false }));
            return;
        }
        setConnecting(key);
        await new Promise(r => setTimeout(r, 1200));
        setConnecting(null);
        setConnected(p => ({ ...p, [key]: true }));
    };

    const integrations = [
        {
            key: "google",
            name: "Google Workspace",
            desc: "Sync files from Drive directly to your whiteboard and launch Google Meet calls within your collaborative sessions.",
            tags: ["FILE SYNC", "VIDEO CALLS", "CALENDAR"],
            icon: (
                <svg viewBox="0 0 48 48" className="h-8 w-8">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.91 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
            ),
        },
        {
            key: "notion",
            name: "Notion",
            desc: "Embed Nexus boards inside Notion pages and pull Notion documents into your whiteboard workspace.",
            tags: ["EMBED BOARDS", "IMPORT DOCS"],
            icon: (
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="white">
                    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                </svg>
            ),
        },
        {
            key: "slack",
            name: "Slack",
            desc: "Get Nexus notifications directly in Slack and share board links that unfurl with previews in your channels.",
            tags: ["NOTIFICATIONS", "LINK PREVIEW", "SHARE"],
            icon: (
                <svg viewBox="0 0 24 24" className="h-8 w-8">
                    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" />
                    <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
                    <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" />
                    <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <SectionHeader title="Integrations" subtitle="Connect Nexus with your daily tools to streamline your creative workflow and team communication." />
            <div className="space-y-4">
                {integrations.map(int => (
                    <Card key={int.key} className="relative overflow-hidden group hover:border-slate-600/80 transition-colors">
                        {/* subtle gradient shimmer on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/3 to-lime-400/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className="flex items-start justify-between gap-6 relative">
                            <div className="flex items-start gap-5 flex-1">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-700/60 border border-slate-600/40">
                                    {int.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-base font-semibold text-white">{int.name}</h3>
                                        {connected[int.key] && (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                                                <Check size={10} /> Connected
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed mb-3">{int.desc}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {int.tags.map(tag => (
                                            <span key={tag} className="text-[10px] font-bold tracking-wider text-slate-400 border border-slate-600/60 rounded-full px-2.5 py-0.5 bg-slate-700/30">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleConnect(int.key)}
                                disabled={connecting === int.key}
                                className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-70 ${connected[int.key]
                                    ? "border border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
                                    : "bg-gradient-to-r from-teal-500 to-lime-400 text-slate-900 shadow-lg shadow-teal-500/20 hover:opacity-90"
                                    }`}
                            >
                                {connecting === int.key && <Loader2 size={13} className="animate-spin" />}
                                {connected[int.key] ? "Disconnect" : "Connect Account"}
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
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
        { id: "security" as Tab, label: "Security", icon: Lock },
        { id: "notifications" as Tab, label: "Notifications", icon: Bell },
        { id: "integrations" as Tab, label: "Integrations", icon: Puzzle },
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
                                placeholder="Search boards…"
                                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 py-2 pl-9 pr-4 text-sm text-slate-300 placeholder-slate-500 outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* Right icons */}
                    <div className="flex items-center gap-2">
                        {/* <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                            <Bell size={16} />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                            <HelpCircle size={16} />
                        </button> */}
                        <button
                            onClick={() => setActiveTab("personal")}
                            className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-lime-400 p-0.5 overflow-hidden hover:opacity-90 transition-opacity"
                        >
                            <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                {session?.user?.image
                                    ? <img src={session.user.image} alt="avatar" className="h-full w-full object-cover" />
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
                    {activeTab === "personal" && <PersonalInfo session={session} />}
                    {activeTab === "security" && <Security />}
                    {activeTab === "notifications" && <Notifications />}
                    {activeTab === "integrations" && <Integrations />}
                </main>
            </div>

            {/* ── FOOTER ──────────────────────────────────────── */}
            <footer className="border-t border-slate-800/60 py-6 text-center">
                <div className="flex items-center justify-center gap-6 mb-2">
                    {["Privacy Policy", "Terms of Service", "Support"].map(l => (
                        <a key={l} href="#" className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider">{l}</a>
                    ))}
                </div>
                <p className="text-xs text-slate-600 uppercase tracking-widest">© 2026 Nexus Collaborative. All rights reserved.</p>
            </footer>
        </div>
    );
}
