"use client";

import { motion } from "framer-motion";

interface CountdownTimerProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  started?: boolean;
  size?: "sm" | "lg";
}

export function CountdownTimer({
  days,
  hours,
  minutes,
  seconds,
  started,
  size = "lg",
}: CountdownTimerProps) {
  if (started) {
    return (
      <div className="text-center">
        <p className="text-emerald-400 font-bold text-lg">Tournament Live!</p>
      </div>
    );
  }

  const units = [
    { value: days, label: "Days" },
    { value: hours, label: "Hours" },
    { value: minutes, label: "Mins" },
    { value: seconds, label: "Secs" },
  ];

  return (
    <div className={`flex gap-2 sm:gap-4 justify-center ${size === "sm" ? "scale-90" : ""}`}>
      {units.map(({ value, label }) => (
        <motion.div
          key={label}
          className="glass-card px-3 sm:px-5 py-3 sm:py-4 text-center min-w-[60px] sm:min-w-[80px]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <div className={`font-black tabular-nums ${size === "lg" ? "text-2xl sm:text-4xl" : "text-xl"}`}>
            {String(value).padStart(2, "0")}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">{label}</div>
        </motion.div>
      ))}
    </div>
  );
}
