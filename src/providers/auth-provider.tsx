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
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_PROFILE: UserProfile = {
  uid: "demo-admin",
  email: "demo@cisco.com",
  displayName: "Demo Admin",
  role: "administrator",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !isFirebaseConfigured();

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
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
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, [isDemo]);

  const signInWithGoogle = async () => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      return;
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
  };

  const signOut = async () => {
    if (isDemo) {
      setProfile(null);
      return;
    }
    await firebaseSignOut(getFirebaseAuth());
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!profile) return false;
    if (profile.role === "administrator") return true;
    return roles.includes(profile.role);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signOut, hasRole, isDemo }}
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
