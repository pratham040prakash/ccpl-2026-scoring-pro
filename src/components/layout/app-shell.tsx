"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Trophy,
  Users,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  LogIn,
  LogOut,
  Tv,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/ccpl", label: "CCPL", icon: Trophy },
  { href: "/fixtures", label: "Fixtures", icon: BarChart3 },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/teams", label: "Teams", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, signInWithGoogle, signOut, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const isFullscreen =
    pathname.includes("/tv") ||
    pathname.includes("/score/mobile") ||
    pathname.includes("/scoreboard");

  if (isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 glass-card border-b border-slate-200/20 mx-0 rounded-none">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center text-white font-black text-sm">
              CCPL
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-tight">Scoring Pro</p>
              <p className="text-xs text-slate-500">CCPL 2026</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors",
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {hasRole("administrator", "scorer") && (
              <Link
                href="/admin"
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5",
                  pathname.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-slate-600"
                )}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {profile ? (
              <button
                onClick={() => signOut()}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary text-white hover:brightness-110"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}

            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden border-t border-slate-200/20 p-4 flex flex-col gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg font-medium",
                  pathname === href ? "bg-primary/10 text-primary" : ""
                )}
              >
                {label}
              </Link>
            ))}
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-lg">
              Admin
            </Link>
            {!profile && (
              <button
                onClick={() => { signInWithGoogle(); setMenuOpen(false); }}
                className="mx-4 mt-2 py-3 rounded-lg bg-primary text-white font-medium"
              >
                Sign in with Google
              </button>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200/20 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 CCPL Scoring Pro · Cisco Champions Premier League</p>
          <div className="flex gap-4">
            <Link href="/ccpl" className="hover:text-primary flex items-center gap-1">
              <Trophy className="w-4 h-4" /> CCPL Hub
            </Link>
            <Link href="/reports" className="hover:text-primary">Reports</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
