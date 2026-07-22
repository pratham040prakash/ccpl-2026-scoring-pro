"use client";

import { useQuery } from "@tanstack/react-query";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  getAnnouncements,
  getFixtures,
  getMatches,
  getPointsTable as fetchPointsTableFromFirestore,
  getSettings,
  getTeams,
} from "@/lib/firebase/firestore";
import { DEMO_DATA } from "@/lib/seed";
import { useMatchResults } from "@/providers/match-results-provider";

function emptyPointsTable() {
  return DEMO_DATA.teams.map((t, i) => ({
    teamId: t.id,
    teamName: t.name,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    nr: 0,
    points: 0,
    runsFor: 0,
    runsAgainst: 0,
    nrr: 0,
    rank: i + 1,
  }));
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!isFirebaseConfigured()) return DEMO_DATA.teams;
      try {
        const teams = await getTeams();
        return teams.length ? teams : DEMO_DATA.teams;
      } catch {
        return DEMO_DATA.teams;
      }
    },
  });
}

export function useFixtures() {
  const { getMergedFixtures, scores } = useMatchResults();
  const scoreKey = Object.keys(scores).length;

  return useQuery({
    queryKey: ["fixtures", scoreKey],
    queryFn: async () => {
      let base = DEMO_DATA.fixtures;
      if (isFirebaseConfigured()) {
        try {
          const fixtures = await getFixtures();
          base = fixtures.length ? fixtures : DEMO_DATA.fixtures;
        } catch {
          base = DEMO_DATA.fixtures;
        }
      }
      return getMergedFixtures(base);
    },
  });
}

export function useMatches(status?: string) {
  return useQuery({
    queryKey: ["matches", status],
    queryFn: async () => {
      if (!isFirebaseConfigured()) return [];
      return getMatches(status);
    },
  });
}

export function usePointsTable() {
  const { getPointsTable, scores } = useMatchResults();
  const scoreKey = Object.keys(scores).length;

  return useQuery({
    queryKey: ["pointsTable", scoreKey],
    queryFn: async () => {
      if (scoreKey > 0) {
        return getPointsTable();
      }
      if (!isFirebaseConfigured()) {
        return emptyPointsTable();
      }
      try {
        const table = await fetchPointsTableFromFirestore();
        return table.length ? table : emptyPointsTable();
      } catch {
        return emptyPointsTable();
      }
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!isFirebaseConfigured()) return DEMO_DATA.settings;
      try {
        const settings = await getSettings();
        return settings || DEMO_DATA.settings;
      } catch {
        return DEMO_DATA.settings;
      }
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      if (!isFirebaseConfigured()) return DEMO_DATA.announcements;
      try {
        const announcements = await getAnnouncements();
        return announcements.length ? announcements : DEMO_DATA.announcements;
      } catch {
        return DEMO_DATA.announcements;
      }
    },
  });
}

export function useTournamentCountdown() {
  const { data: settings } = useSettings();
  const target = settings?.startDate ? new Date(settings.startDate).getTime() : new Date("2026-07-27").getTime();

  return useQuery({
    queryKey: ["countdown", target],
    queryFn: () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { days, hours, minutes, seconds, started: diff === 0 };
    },
    refetchInterval: 1000,
  });
}

export function useMatchScore(fixtureId: string) {
  const { scores } = useMatchResults();
  return scores[fixtureId];
}
