import teamsData from "@/data/teams.json";
import { slugify } from "@/lib/utils";

export interface RosterPlayer {
  id: string;
  name: string;
  email?: string;
}

function playerId(teamName: string, playerName: string): string {
  return slugify(`${teamName}-${playerName}`);
}

export function getTeamRoster(teamName: string): RosterPlayer[] {
  const team = teamsData.find((t) => t.name === teamName);
  if (!team) return [];
  return team.players.map((p) => ({
    id: playerId(team.name, p.name),
    name: p.name,
    email: p.email ?? undefined,
  }));
}

export function getPlayerName(teamName: string, playerId: string): string {
  return getTeamRoster(teamName).find((p) => p.id === playerId)?.name ?? playerId;
}

export function defaultPlayingXi(teamName: string, count = 11): RosterPlayer[] {
  return getTeamRoster(teamName).slice(0, count);
}

export function resolvePlayingXi(
  teamName: string,
  storedIds: string[] | undefined
): RosterPlayer[] {
  const roster = getTeamRoster(teamName);
  if (!storedIds?.length) return roster.slice(0, 11);
  return storedIds
    .map((id) => roster.find((p) => p.id === id))
    .filter((p): p is RosterPlayer => Boolean(p));
}
