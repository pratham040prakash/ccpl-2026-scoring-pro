"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type TouchButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "run" | "wicket" | "extra" | "neutral" | "ghost";
  size?: "md" | "lg" | "xl";
};

const VARIANTS = {
  primary: "bg-primary text-white shadow-lg shadow-primary/20",
  run: "bg-emerald-600 text-white",
  wicket: "bg-red-600 text-white",
  extra: "bg-amber-600 text-white",
  neutral: "bg-slate-700 text-white dark:bg-slate-800",
  ghost: "bg-slate-100 dark:bg-slate-800 text-foreground",
};

const SIZES = {
  md: "min-h-[48px] text-base px-4 rounded-xl",
  lg: "min-h-[56px] text-lg px-5 rounded-2xl font-bold",
  xl: "min-h-[64px] text-2xl px-6 rounded-2xl font-black",
};

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  function TouchButton(
    { className, variant = "primary", size = "lg", children, ...props },
    ref
  ) {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "inline-flex items-center justify-center touch-target select-none transition-opacity disabled:opacity-40",
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
