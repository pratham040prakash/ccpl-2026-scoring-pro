"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { getUserProfile, upsertUserProfile } from "@/lib/firebase/firestore";
import { formatAuthError } from "@/lib/auth/errors";
import type { UserProfile, UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signingIn: boolean;
  signInError: string | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isDemo: boolean;
  isProduction: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrapAdminIfAllowed(firebaseUser: User): Promise<UserRole | null> {
  try {
    const token = await firebaseUser.getIdToken();
    const res = await fetch("/api/admin/bootstrap", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { success?: boolean; role?: UserRole };
    if (data.success && data.role) return data.role;
  } catch {
    // Non-fatal — user may not be in ADMIN_EMAILS
  }
  return null;
}

function profileFromAuthUser(firebaseUser: User, role: UserRole = "viewer"): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "User",
    photoURL: firebaseUser.photoURL || undefined,
    role,
    createdAt: now,
    updatedAt: now,
  };
}

async function loadUserProfile(firebaseUser: User): Promise<UserProfile> {
  try {
    let userProfile = await getUserProfile(firebaseUser.uid);
    if (!userProfile) {
      userProfile = profileFromAuthUser(firebaseUser);
      await upsertUserProfile(userProfile);
    }

    if (userProfile.role !== "administrator") {
      const bootRole = await bootstrapAdminIfAllowed(firebaseUser);
      if (bootRole) {
        userProfile = { ...userProfile, role: bootRole };
      } else {
        userProfile = (await getUserProfile(firebaseUser.uid)) || userProfile;
      }
    }

    return userProfile;
  } catch {
    let userProfile = profileFromAuthUser(firebaseUser);
    const bootRole = await bootstrapAdminIfAllowed(firebaseUser);
    if (bootRole) userProfile = { ...userProfile, role: bootRole };
    return userProfile;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const isProduction = isFirebaseConfigured();
  const isDemo = !isProduction;

  useEffect(() => {
    if (isDemo) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();

    void getRedirectResult(auth).catch((error) => {
      setSignInError(formatAuthError(error));
    });

    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userProfile = await loadUserProfile(firebaseUser);
          setProfile(userProfile);
          setSignInError(null);
        } catch (error) {
          setSignInError(formatAuthError(error));
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setSigningIn(false);
    });
  }, [isDemo]);

  const signInWithEmailPassword = async (email: string, password: string) => {
    setSignInError(null);

    if (isDemo) {
      setSignInError(
        "Firebase is not configured on this deployment. Add NEXT_PUBLIC_FIREBASE_* variables in Vercel and redeploy."
      );
      return;
    }

    if (!email || !password) {
      setSignInError("Enter your email and password.");
      return;
    }

    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (error) {
      setSignInError(formatAuthError(error));
      setSigningIn(false);
    }
  };

  const signInWithGoogle = async () => {
    setSignInError(null);

    if (isDemo) {
      setSignInError(
        "Firebase is not configured on this deployment. Add NEXT_PUBLIC_FIREBASE_* variables in Vercel and redeploy."
      );
      return;
    }

    setSigningIn(true);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          setSignInError(formatAuthError(redirectError));
          setSigningIn(false);
          return;
        }
      }

      if (code === "auth/popup-closed-by-user") {
        setSignInError(formatAuthError(error));
        setSigningIn(false);
        return;
      }

      setSignInError(formatAuthError(error));
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    if (isDemo) return;
    await firebaseSignOut(getFirebaseAuth());
    setProfile(null);
    setUser(null);
    setSignInError(null);
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!profile) return false;
    if (profile.role === "administrator") return true;
    return roles.includes(profile.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signingIn,
        signInError,
        signInWithEmailPassword,
        signInWithGoogle,
        signOut,
        hasRole,
        isDemo,
        isProduction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
