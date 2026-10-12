"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestSignupOtpAction, resendSignupOtpAction, verifySignupOtpAction } from "@/actions/auth.actions";
import { signIn } from "next-auth/react";

interface SignupDetails {
    name: string;
    email: string;
    password: string;
    phone: string;
}

function SignupForm() {
    const [step, setStep] = useState<"details" | "verification">("details");
    const [details, setDetails] = useState<SignupDetails>({ name: "", email: "", password: "", phone: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefilledEmail = searchParams.get("email") || "";

    async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const nextDetails: SignupDetails = {
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
            phone: String(formData.get("phone") || ""),
        };
        const result = await requestSignupOtpAction(nextDetails);
        setIsLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        setDetails(nextDetails);
        setStep("verification");
    }

    async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const result = await verifySignupOtpAction({
            email: details.email,
            code: String(formData.get("code") || ""),
        });

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
            return;
        }

        const signInResult = await signIn("credentials", {
            email: details.email,
            password: details.password,
            redirect: false,
        });
        if (signInResult?.error) {
            setError("Your email is verified. Please sign in with your password.");
            setIsLoading(false);
            return;
        }

        router.push(searchParams.get("callbackUrl") || "/dashboard");
        router.refresh();
    }

    async function handleResendCode() {
        setIsLoading(true);
        setError(null);
        const result = await resendSignupOtpAction({ email: details.email });
        setIsLoading(false);
        if (result.error) setError(result.error);
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
                {step === "details" ? "Create Account" : "Verify Your Email"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
                {step === "details"
                    ? "We will email a verification code before creating your account."
                    : `Enter the code sent to ${details.email}.`}
            </p>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-2xl mb-6 font-medium">{error}</div>}

            {step === "details" ? (
                <form onSubmit={handleSendCode} className="space-y-6">
                    <Field label="Full Name" name="name" type="text" placeholder="Alex Johnson" icon={<User />} defaultValue={details.name} required />
                    <Field label="Email Address" name="email" type="email" placeholder="name@example.com" icon={<Mail />} defaultValue={details.email || prefilledEmail} required />
                    <Field label="Mobile Number (Optional)" name="phone" type="tel" placeholder="+91 98765 43210" icon={<Phone />} defaultValue={details.phone} />
                    <Field label="Password" name="password" type="password" placeholder="min. 8 characters" icon={<Lock />} required />
                    <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-2xl bg-saffron-500 hover:bg-saffron-400 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-saffron-500/20">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Verification Code <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                    <Field label="6-Digit Verification Code" name="code" type="text" placeholder="123456" icon={<ShieldCheck />} required inputMode="numeric" maxLength={6} />
                    <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-2xl bg-saffron-500 hover:bg-saffron-400 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-saffron-500/20">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                    <button type="button" onClick={handleResendCode} disabled={isLoading} className="w-full text-sm font-bold text-slate-400 hover:text-saffron-500 disabled:opacity-50">Resend code</button>
                    <button type="button" onClick={() => { setError(null); setStep("details"); }} disabled={isLoading} className="w-full text-sm font-bold text-slate-400 hover:text-white disabled:opacity-50">Change email or details</button>
                </form>
            )}

            <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <p className="text-slate-500 text-sm font-medium">Already have an account? <Link href="/login" className="text-saffron-500 hover:text-saffron-400 font-black transition-colors">Sign In</Link></p>
            </div>
        </div>
    );
}

interface FieldProps {
    label: string;
    name: string;
    type: string;
    placeholder: string;
    icon: React.ReactNode;
    required?: boolean;
    defaultValue?: string;
    inputMode?: "numeric";
    maxLength?: number;
}

function Field({ label, name, type, placeholder, icon, required, defaultValue, inputMode, maxLength }: FieldProps) {
    return <div className="space-y-2"><Label htmlFor={name} className="text-slate-400 font-bold ml-1">{label}</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500">{icon}</span><Input id={name} name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} inputMode={inputMode} maxLength={maxLength} className="bg-slate-950/50 border-slate-800 h-12 pl-12 rounded-2xl text-white focus:ring-saffron-500 focus:border-saffron-500 transition-all font-medium" /></div></div>;
}

export default function SignupPage() {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden"><div className="absolute top-1/4 left-1/4 w-96 h-96 bg-saffron-500/10 blur-[128px] pointer-events-none" /><div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/5 blur-[128px] pointer-events-none" /><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md z-10"><div className="flex flex-col items-center mb-8"><div className="relative w-24 h-24 mb-4"><Image src="/logo.png" alt="UTSAV Logo" fill className="object-contain" priority /></div><h1 className="text-4xl font-black text-white tracking-tighter">UTSAV</h1><p className="text-slate-500 font-medium mt-2">Start Managing Your Organization</p></div><Suspense fallback={<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-saffron-500 animate-spin" /></div>}><SignupForm /></Suspense></motion.div></div>;
}
