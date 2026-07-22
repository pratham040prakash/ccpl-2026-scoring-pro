"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { isNavActive, MOBILE_BOTTOM_NAV } from "./nav-config";

export function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-slate-200/20 bg-[var(--card)]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <ul className="grid grid-cols-5 h-16">
        {MOBILE_BOTTOM_NAV.map(({ href, label, icon: Icon, match }) => {
          const active = isNavActive({ href, label, icon: Icon, match }, pathname);
          return (
            <li key={label}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold transition-colors touch-target",
                  active ? "text-primary" : "text-slate-500"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "scale-110")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
