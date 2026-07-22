"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  submitLabel?: string;
  showDemoHint?: boolean;
  showGoogleOption?: boolean;
  redirectTo?: string;
};

export function SignInPanel({
  className,
  submitLabel = "Sign in",
  showDemoHint = true,
  showGoogleOption = true,
}: Props) {
  const { signInWithEmailPassword, signInWithGoogle, signingIn, signInError, isDemo, isProduction } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await signInWithEmailPassword(email.trim(), password);
  };

  return (
    <div className={cn("space-y-4 text-left", className)}>
      {isDemo && showDemoHint && (
        <div className="p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 text-sm">
          <p className="font-semibold mb-1">Firebase not configured</p>
          <p>
            Add <code className="text-xs bg-black/10 px-1 rounded">NEXT_PUBLIC_FIREBASE_*</code> env vars in
            Vercel, then redeploy to enable sign-in.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="username email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={signingIn || isDemo}
            className="w-full px-4 py-3 rounded-xl border border-slate-200/30 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium mb-1.5">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={signingIn || isDemo}
            className="w-full px-4 py-3 rounded-xl border border-slate-200/30 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
        </div>

        {isProduction && (
          <p className="text-xs text-slate-500">
            Admin access: use <strong>sppratham@gmail.com</strong> and the password set in Firebase.
          </p>
        )}

        <button
          type="submit"
          disabled={signingIn || isDemo}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </form>

      {signInError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {signInError}
        </p>
      )}

      {showGoogleOption && isProduction && (
        <div className="pt-2 border-t border-slate-200/20">
          <p className="text-xs text-slate-500 text-center mb-3">Or continue with</p>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={signingIn}
            className="w-full px-6 py-3 rounded-xl border border-slate-200/30 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}
