"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SelectionSheet({
  open,
  title,
  subtitle,
  onClose,
  searchPlaceholder = "Search name or jersey…",
  search,
  onSearchChange,
  children,
  footer,
}: SelectionSheetProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="selection-sheet-title"
            className={cn(
              "fixed z-[61] glass-card flex flex-col",
              "inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl border-t border-white/10",
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "sm:max-w-2xl sm:w-full sm:max-h-[85vh] sm:rounded-2xl"
            )}
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-500/60" />
            </div>

            <div className="flex items-start justify-between gap-3 px-4 pt-2 pb-3 border-b border-white/10">
              <div>
                <h2 id="selection-sheet-title" className="text-lg font-black">
                  {title}
                </h2>
                {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800/80 text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>

            {footer && (
              <div className="px-4 py-3 border-t border-white/10 bg-slate-900/40">{footer}</div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Keyboard grid navigation helper for card lists */
export function useCardListKeyboard(
  itemCount: number,
  onSelect: (index: number) => void,
  enabled: boolean
) {
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (itemCount === 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, itemCount - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(focusIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, itemCount, focusIndex, onSelect]);

  return { focusIndex, setFocusIndex };
}
