"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client"; // Importing our Better Auth hook

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Handle traditional Email/Password Login
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(""); // Clear any previous errors

        const formData = new FormData(e.target as HTMLFormElement);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const { data, error: authError } = await signIn.email({
            email,
            password,
        });

        if (authError) {
            setError(authError.message || "Invalid email or password.");
            setIsLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    // Handle Social Logins
    const handleSocialLogin = async (provider: "google") => {
        setIsLoading(true);
        setError("");

        const { data, error: authError } = await signIn.social({
            provider,
            callbackURL: "/dashboard"
        });

        if (authError) {
            setError(authError.message || `Failed to login with ${provider}.`);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-50 font-sans">
            {/* Left Side: Visual & Branding */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:w-1/2 relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-slate-900"
            >
                {/* Background Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/30 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[120px]" />
                </div>

                <div className="relative z-10">
                    <Link href="/" className="text-3xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity">
                        Nexus
                    </Link>
                </div>

                <div className="relative z-10 max-w-lg">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl font-black tracking-tighter leading-[1.1] mb-6"
                    >
                        Where structured flow meets <span className="text-primary italic">raw creative</span> energy.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg text-slate-400 leading-relaxed"
                    >
                        Experience the future of collaborative whiteboarding. A canvas designed to amplify your team&apos;s collective genius.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-4 mt-12"
                    >
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800">
                                    <img
                                        src={`https://picsum.photos/seed/auth${i}/100/100`}
                                        alt="User avatar"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Joined by 10k+ innovators</span>
                    </motion.div>
                </div>

                <div className="relative z-10 flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                    <span>© 2026 Nexus Collaborative. All rights reserved.</span>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-slate-400 transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-slate-400 transition-colors">Terms</Link>
                    </div>
                </div>
            </motion.div>

            {/* Right Side: Login Form */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex-1 flex flex-col justify-center items-center p-6 lg:p-24 bg-slate-950"
            >
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-black tracking-tight mb-2">Welcome back</h2>
                        <p className="text-slate-400">Please enter your details to sign in</p>
                    </div>

                    {/* Error Message Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => handleSocialLogin("google")}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-950 px-4 text-slate-500 font-bold tracking-widest">Or</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    disabled={isLoading}
                                    placeholder="student@example.com"
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                                <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-dim transition-colors">Forgot Password?</Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    disabled={isLoading}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient text-white py-4 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-2xl transition-all transform active:scale-[0.98] mt-4 flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in to Workspace"
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-primary font-bold hover:underline">
                            Create one for free
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}