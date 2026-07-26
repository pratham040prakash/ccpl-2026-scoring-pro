"use client";

import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  photoUrl?: string;
  ringClass?: string;
}

const SIZE = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-16 h-16 text-xl",
};

export function PlayerAvatar({ name, size = "md", photoUrl, ringClass }: PlayerAvatarProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", SIZE[size], ringClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-black text-white bg-gradient-to-br from-primary to-accent",
        SIZE[size],
        ringClass
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
