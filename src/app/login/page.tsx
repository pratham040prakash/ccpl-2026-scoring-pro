"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/providers/auth-provider";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile) {
      router.replace(redirect);
    }
  }, [loading, profile, redirect, router]);

  if (loading) {
    return <p className="text-slate-500 text-center">Checking sign-in status…</p>;
  }

  if (profile) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="glass-card p-8">
        <div className="text-center mb-8">
          <LogIn className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-black mb-2">Sign in</h1>
          <p className="text-slate-500 text-sm">Enter your email and password to continue</p>
        </div>
        <SignInPanel />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-500">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
