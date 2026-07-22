"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
  showDemoHint?: boolean;
};

export function GoogleSignInButton({
  className,
  label = "Sign in with Google",
  showDemoHint = true,
}: Props) {
  const { signInWithGoogle, signingIn, signInError, isDemo, isProduction } = useAuth();

  return (
    <div className="space-y-4">
      {isDemo && showDemoHint && (
        <div className="p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 text-sm text-left">
          <p className="font-semibold mb-1">Firebase not configured</p>
          <p>
            Add <code className="text-xs bg-black/10 px-1 rounded">NEXT_PUBLIC_FIREBASE_*</code> env vars in
            Vercel, then redeploy. Google sign-in will work after that.
          </p>
        </div>
      )}

      {isProduction && (
        <p className="text-xs text-slate-500">Use your Google account (sppratham@gmail.com for admin).</p>
      )}

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={signingIn || isDemo}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed",
          className
        )}
      >
        {signingIn ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          label
        )}
      </button>

      {signInError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {signInError}
        </p>
      )}
    </div>
  );
}
