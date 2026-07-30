"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ScorecardSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function ScorecardSection({
  title,
  children,
  defaultOpen = true,
  className,
}: ScorecardSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("glass-card overflow-hidden print:break-inside-avoid", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-200/40 dark:border-slate-700/40 lg:cursor-default"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {title}
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform lg:hidden",
            open && "rotate-180"
          )}
        />
      </button>
      <div className={cn("lg:block", open ? "block" : "hidden")}>{children}</div>
    </section>
  );
}
