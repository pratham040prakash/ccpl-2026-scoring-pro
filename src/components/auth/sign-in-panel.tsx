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
        <div className="p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 text-sm space-y-2">
          <p className="font-semibold">Firebase not configured on this deployment</p>
          <p>Sign-in is disabled until Firebase env vars are added in Vercel and the site is redeployed.</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Create a project in{" "}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Firebase Console
              </a>{" "}
              → Project settings → Web app → copy config values
            </li>
            <li>
              Add env vars in{" "}
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Vercel → Settings → Environment Variables
              </a>
            </li>
            <li>Redeploy (Deployments → Redeploy latest)</li>
            <li>
              Firebase → Authentication → enable Email/Password → Add user{" "}
              <strong>sppratham@gmail.com</strong>
            </li>
          </ol>
          <p className="text-xs opacity-90">
            Required vars:{" "}
            <code className="bg-black/10 px-1 rounded">NEXT_PUBLIC_FIREBASE_API_KEY</code>,{" "}
            <code className="bg-black/10 px-1 rounded">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>, and 4 more — see{" "}
            <code className="bg-black/10 px-1 rounded">docs/FIREBASE_SETUP.md</code>
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
