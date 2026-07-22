"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  LogIn,
  Bell,
  Search,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);

  const loginHref =
    pathname.startsWith("/admin") || pathname.startsWith("/login")
      ? "/login?redirect=/admin"
      : `/login?redirect=${encodeURIComponent(pathname)}`;

  const isFullscreen =
    pathname.includes("/tv") ||
    pathname.includes("/score/mobile") ||
    pathname.includes("/scoreboard");

  if (isFullscreen) {
    return <>{children}</>;
  }

  const showLiveBadge = pathname.startsWith("/live/") && pathname !== "/live";

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Desktop sidebar */}
      <SidebarNav
        pathname={pathname}
        collapsed={sidebarCollapsed}
        className="hidden lg:flex sticky top-0 h-screen"
      />

      {/* Tablet overlay sidebar */}
      {tabletSidebarOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setTabletSidebarOpen(false)}
          />
          <SidebarNav
            pathname={pathname}
            onNavigate={() => setTabletSidebarOpen(false)}
            className="relative h-full shadow-2xl animate-in slide-in-from-left duration-200"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 glass-card border-b border-slate-200/20 rounded-none mx-0">
          <div className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="hidden md:flex lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
                onClick={() => setTabletSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
              <Link href="/" className="flex items-center gap-2 lg:hidden min-w-0">
                <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center text-white font-black text-[10px] shrink-0">
                  CCPL
                </div>
                <span className="font-bold text-sm truncate">Scoring Pro</span>
              </Link>
              {showLiveBadge && <span className="live-badge lg:hidden">LIVE</span>}
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <label className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search teams, fixtures…"
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-target relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {profile ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline max-w-[120px] truncate">{profile.displayName}</span>
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary text-white hover:brightness-110 min-h-[44px]"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Link>
              )}

              <button
                type="button"
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-target"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="md:hidden border-t border-slate-200/20 p-4 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
              <Link href="/live" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-medium min-h-[48px] flex items-center">
                Live Matches
              </Link>
              <Link href="/fixtures" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl min-h-[48px] flex items-center">
                Fixtures
              </Link>
              <Link href="/standings" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl min-h-[48px] flex items-center">
                Standings
              </Link>
              <Link href="/leaderboards" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl min-h-[48px] flex items-center">
                Leaderboards
              </Link>
              {hasRole("administrator", "scorer") && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl min-h-[48px] flex items-center">
                  Admin
                </Link>
              )}
              {!profile && (
                <Link
                  href={loginHref}
                  onClick={() => setMenuOpen(false)}
                  className="mx-0 mt-2 py-3 rounded-xl bg-primary text-white font-medium text-center min-h-[48px] flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Link>
              )}
            </nav>
          )}
        </header>

        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <BottomNav pathname={pathname} />

        <footer className="hidden md:block border-t border-slate-200/20 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© 2026 CCPL Scoring Pro · Cisco Champions Premier League</p>
            <div className="flex gap-4">
              <Link href="/ccpl" className="hover:text-primary">
                CCPL Hub
              </Link>
              <Link href="/reports" className="hover:text-primary">
                Reports
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
