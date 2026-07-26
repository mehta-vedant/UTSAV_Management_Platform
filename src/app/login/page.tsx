"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefilledEmail = searchParams.get("email") || "";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
                setIsLoading(false);
            } else {
                router.push(searchParams.get("callbackUrl") || "/dashboard");
                router.refresh();
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-2xl mb-6 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-400 font-bold ml-1">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            defaultValue={prefilledEmail}
                            required
                            className="bg-slate-950/50 border-slate-800 h-12 pl-12 rounded-2xl text-white focus:ring-saffron-500 focus:border-saffron-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <Label htmlFor="password" className="text-slate-400 font-bold">Password</Label>
                        <button type="button" className="text-xs text-saffron-500 hover:text-saffron-400 font-bold">Forgot?</button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            className="bg-slate-950/50 border-slate-800 h-12 pl-12 rounded-2xl text-white focus:ring-saffron-500 focus:border-saffron-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-saffron-500 hover:bg-saffron-400 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-saffron-500/20 transition-all disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Sign In <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <p className="text-slate-500 text-sm font-medium">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-saffron-500 hover:text-saffron-400 font-black transition-colors">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] p-3 sm:p-6">
            {/* Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-saffron-500/10 blur-[128px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/5 blur-[128px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md z-10"
            >
                {/* Brand Header */}
                <div className="mb-6 flex flex-col items-center sm:mb-8">
                    <div className="relative mb-4 h-20 w-20 sm:h-24 sm:w-24">
                        <Image
                            src="/logo.png"
                            alt="UTSAV Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">UTSAV</h1>
                    <p className="mt-2 text-center font-medium text-slate-500">Traditional Trust, Modern Management</p>
                </div>

                {/* Login Card wrapping in Suspense */}
                <Suspense fallback={
                    <div className="flex min-h-[320px] items-center justify-center rounded-[2.5rem] border border-slate-800 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl sm:min-h-[400px] sm:p-8">
                        <Loader2 className="w-8 h-8 text-saffron-500 animate-spin" />
                    </div>
                }>
                    <LoginForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
