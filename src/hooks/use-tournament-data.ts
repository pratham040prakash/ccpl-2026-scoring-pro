"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  getAnnouncements,
  getFixtures,
  getMatches,
  getPlayers,
  getPointsTable as fetchPointsTableFromFirestore,
  getSettings,
  getTeams,
} from "@/lib/firebase/firestore";
import { DEMO_DATA } from "@/lib/seed";
import {
  getBundledOfficialPointsTable,
  officialStandingsPlayedCount,
} from "@/lib/scores/official-results";
import { useMatchResults } from "@/providers/match-results-provider";
import type { Player, PointsTableEntry } from "@/types";

function pickBestPointsTable(
  candidates: PointsTableEntry[][]
): PointsTableEntry[] {
  let best = getBundledOfficialPointsTable();
  let bestPlayed = officialStandingsPlayedCount(best);

  for (const table of candidates) {
    const played = officialStandingsPlayedCount(table);
    if (played > bestPlayed) {
      best = table;
      bestPlayed = played;
    }
  }

  return best;
}

function orderPlayers(players: Player[], playerIds?: string[]): Player[] {
  if (!playerIds?.length) {
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }

  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = playerIds
    .map((id) => byId.get(id))
    .filter((player): player is Player => Boolean(player));

  for (const player of players) {
    if (!ordered.some((entry) => entry.id === player.id)) {
      ordered.push(player);
    }
  }

  return ordered;
}

export function usePlayers(teamId?: string) {
  return useQuery({
    queryKey: ["players", teamId ?? "all"],
    queryFn: async () => {
      const demoPlayers = teamId
        ? DEMO_DATA.players.filter((player) => player.teamId === teamId)
        : DEMO_DATA.players;

      if (!isFirebaseConfigured()) {
        return orderPlayers(demoPlayers, DEMO_DATA.teams.find((team) => team.id === teamId)?.playerIds);
      }

      try {
        const [players, teams] = teamId
          ? await Promise.all([getPlayers(teamId), getTeams()])
          : [await getPlayers(), [] as Awaited<ReturnType<typeof getTeams>>];

        if (players.length) {
          const team = teamId ? teams.find((entry) => entry.id === teamId) : undefined;
          return orderPlayers(players, team?.playerIds);
        }
      } catch {
        /* fall through */
      }

      return orderPlayers(demoPlayers, DEMO_DATA.teams.find((team) => team.id === teamId)?.playerIds);
    },
  });
}

export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const demoPlayer = DEMO_DATA.players.find((player) => player.id === playerId);
      if (!isFirebaseConfigured()) return demoPlayer ?? null;

      try {
        const players = await getPlayers();
        const player = players.find((entry) => entry.id === playerId);
        if (player) return player;
      } catch {
        /* fall through */
      }

      return demoPlayer ?? null;
    },
  });
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["pointsTable"] });
    };
    window.addEventListener("ccpl-standings-updated", refresh);
    return () => window.removeEventListener("ccpl-standings-updated", refresh);
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["pointsTable", scoreKey],
    initialData: getBundledOfficialPointsTable,
    queryFn: async () => {
      const localTable = getPointsTable();
      const candidates: PointsTableEntry[][] = [localTable];

      try {
        const staticRes = await fetch("/data/day1-standings.json", { cache: "no-store" });
        if (staticRes.ok) {
          const payload = (await staticRes.json()) as { table?: PointsTableEntry[] };
          if (payload.table?.length) candidates.unshift(payload.table);
        }
      } catch {
        /* static fallback optional */
      }

      try {
        const res = await fetch("/api/standings", { cache: "no-store" });
        if (res.ok) {
          const payload = (await res.json()) as { table?: PointsTableEntry[] };
          if (payload.table?.length) candidates.unshift(payload.table);
        }
      } catch {
        /* optional server sync */
      }

      if (isFirebaseConfigured()) {
        try {
          const table = await fetchPointsTableFromFirestore();
          if (table.length) candidates.unshift(table);
        } catch {
          /* fall through */
        }
      }

      return pickBestPointsTable(candidates);
    },
    refetchInterval: 15000,
  });

  return query;
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
