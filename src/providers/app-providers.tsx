"use client";

import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { MatchResultsProvider } from "@/providers/match-results-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <MatchResultsProvider>
        <AuthProvider>{children}</AuthProvider>
      </MatchResultsProvider>
    </QueryProvider>
  );
}
