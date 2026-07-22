"use client";

import { useRef, useEffect } from "react";
import type { CommentaryEntry } from "@/types";
import { formatTime } from "@/lib/utils";

interface CommentaryFeedProps {
  entries: CommentaryEntry[];
  maxHeight?: string;
}

export function CommentaryFeed({ entries, maxHeight = "24rem" }: CommentaryFeedProps) {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-slate-500 text-sm">
        Commentary will appear here ball by ball
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200/10">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500">
          Live Commentary
        </h4>
      </div>
      <div
        className="overflow-y-auto divide-y divide-slate-200/10"
        style={{ maxHeight }}
      >
        <div ref={topRef} />
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-3 hover:bg-slate-50/5">
            <div className="flex gap-3">
              <span
                className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                  entry.type === "wicket"
                    ? "bg-red-500"
                    : entry.type === "milestone"
                      ? "bg-amber-400"
                      : "bg-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{entry.text}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
