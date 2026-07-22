# Firestore Schema — CCPL 2026 Scoring Pro

## Collections Overview

### `users`
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "administrator" | "scorer" | "captain" | "viewer";
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `teams`
```typescript
{
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  captainId?: string;
  viceCaptainId?: string;
  coach?: string;
  manager?: string;
  playerIds: string[];
  stats: TeamStats;
  seed?: number;
}
```

### `players`
```typescript
{
  id: string;
  name: string;
  email?: string;
  teamId: string;
  photoUrl?: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  battingStyle: "right_hand" | "left_hand";
  bowlingStyle: string;
  isCaptain?: boolean;
  stats: PlayerStats;
  awards: string[];
}
```

### `fixtures`
```typescript
{
  id: string;
  matchId: string;        // e.g. "R1-1", "QF1", "F"
  date: string;           // ISO date
  startTime: string;      // "09:00"
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  stage: "round_1" | "integration" | "quarter_final" | "semi_final" | "final";
  overs: number;
  ground: string;
  status: "scheduled" | "live" | "paused" | "completed" | "locked" | "published";
  placeholderA?: string;    // "Winner R1-9", "Seed 1"
  placeholderB?: string;
  seedA?: number;
  seedB?: number;
  order: number;
}
```

### `matches`
```typescript
{
  id: string;
  fixtureId: string;
  matchId: string;
  status: MatchStatus;
  teamAId: string;
  teamBId: string;
  playingXiA: string[];
  playingXiB: string[];
  tossWinnerId?: string;
  tossDecision?: "bat" | "bowl";
  target?: number;
  result?: { winnerId, winnerName, margin, marginType, summary };
  locked: boolean;
  published: boolean;
  shareSlug: string;
}
```

### `innings`
```typescript
{
  id: string;
  matchId: string;
  teamId: string;
  inningsNumber: 1 | 2;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: { total, wides, noBalls, byes, legByes, penalty };
  runRate: number;
  requiredRunRate?: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  partnership: Partnership;
  completed: boolean;
}
```

### `balls`
```typescript
{
  id: string;
  matchId: string;
  inningsId: string;
  overNumber: number;
  ballNumber: number;
  sequence: number;
  bowlerId: string;
  strikerId: string;
  runs: number;
  batsmanRuns: number;
  extra: "wide" | "no_ball" | "bye" | "leg_bye" | "penalty" | null;
  isWicket: boolean;
  dismissal?: DismissalType;
  commentary: string;
  timestamp: string;
  isLegalDelivery: boolean;
}
```

### `commentary`
```typescript
{
  id: string;
  matchId: string;
  ballId?: string;
  text: string;
  type: "ball" | "milestone" | "wicket" | "over" | "innings" | "match";
  timestamp: string;
}
```

### `pointsTable`
Document per team with rank, played, won, lost, points, nrr.

### `leaderboards`
Documents for orangeCap, purpleCap, mostSixes, etc.

### `settings`
Single document `tournament` with venue, rules, officials, sponsors.

## Indexes Required

```
fixtures: order ASC
matches: date ASC, status ASC
balls: inningsId ASC, sequence ASC
commentary: matchId ASC, timestamp DESC
players: teamId ASC
```

## Security

See `firebase/firestore.rules` for role-based access:
- Public read: teams, players, fixtures, matches, innings, balls, commentary, standings
- Scorer write: matches, innings, balls, commentary
- Admin write: all collections
