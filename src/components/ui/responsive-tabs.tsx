"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

interface ResponsiveTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function ResponsiveTabs({ tabs, active, onChange, className }: ResponsiveTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all min-h-[44px]",
            active === tab.id
              ? "bg-primary text-white shadow-md"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
