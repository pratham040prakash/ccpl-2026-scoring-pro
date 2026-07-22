"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { getUserProfile, upsertUserProfile } from "@/lib/firebase/firestore";
import type { UserProfile, UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isDemo: boolean;
  isProduction: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrapAdminIfAllowed(firebaseUser: User): Promise<void> {
  try {
    const token = await firebaseUser.getIdToken();
    await fetch("/api/admin/bootstrap", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Non-fatal — user may not be in ADMIN_EMAILS
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let userProfile = await getUserProfile(firebaseUser.uid);
        if (!userProfile) {
          userProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "User",
            photoURL: firebaseUser.photoURL || undefined,
            role: "viewer",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await upsertUserProfile(userProfile);
        }

        if (userProfile.role !== "administrator") {
          await bootstrapAdminIfAllowed(firebaseUser);
          userProfile = (await getUserProfile(firebaseUser.uid)) || userProfile;
        }

        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, [isDemo]);

  const signInWithGoogle = async () => {
    if (isDemo) {
      throw new Error("Configure Firebase env vars for production sign-in.");
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
  };

  const signOut = async () => {
    if (isDemo) return;
    await firebaseSignOut(getFirebaseAuth());
    setProfile(null);
    setUser(null);
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
