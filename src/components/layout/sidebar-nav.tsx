"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { ADMIN_NAV, isNavActive, PRIMARY_NAV, type NavItem } from "./nav-config";

interface SidebarNavProps {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({
  pathname,
  collapsed,
  onNavigate,
  className,
}: SidebarNavProps) {
  const { hasRole } = useAuth();
  const items: NavItem[] = [
    ...PRIMARY_NAV,
    ...(hasRole("administrator", "scorer") ? [ADMIN_NAV] : []),
  ];

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-200/20 bg-[var(--card)]/80 backdrop-blur-xl shrink-0",
        collapsed ? "w-[4.5rem]" : "w-56 xl:w-64",
        className
      )}
    >
      <div className={cn("p-4 border-b border-slate-200/10", collapsed && "px-2")}>
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 shrink-0 rounded-xl gradient-hero flex items-center justify-center text-white font-black text-xs">
            CCPL
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">Scoring Pro</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">2026</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {items.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
