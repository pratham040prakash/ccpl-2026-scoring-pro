import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { buildSeedData } from "@/lib/seed";

export const runtime = "nodejs";

export async function POST() {
  if (!isFirebaseConfigured()) {
    const data = buildSeedData();
    return NextResponse.json({
      success: true,
      message: `Demo mode: ${data.teams.length} teams, ${data.fixtures.length} fixtures ready locally. Configure Firebase env vars to seed Firestore.`,
      counts: {
        teams: data.teams.length,
        players: data.players.length,
        fixtures: data.fixtures.length,
      },
    });
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Firebase is configured but FIREBASE_SERVICE_ACCOUNT_JSON is missing. Add service account JSON to .env.local (see docs/FIREBASE_SETUP.md).",
      },
      { status: 400 }
    );
  }

  try {
    const db = getFirebaseAdminDb();
    if (!db) {
      throw new Error("Failed to initialize Firebase Admin SDK");
    }

    const data = buildSeedData();
    const seedPlayerIds = new Set(data.players.map((p) => p.id));
    const seedTeamIds = new Set(data.teams.map((t) => t.id));
    const seedFixtureIds = new Set(data.fixtures.map((f) => f.id));

    const [existingPlayers, existingTeams, existingFixtures] = await Promise.all([
      db.collection("players").get(),
      db.collection("teams").get(),
      db.collection("fixtures").get(),
    ]);

    const batch = db.batch();

    for (const doc of existingPlayers.docs) {
      if (!seedPlayerIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    }
    for (const doc of existingTeams.docs) {
      if (!seedTeamIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    }
    for (const doc of existingFixtures.docs) {
      if (!seedFixtureIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    }

    for (const team of data.teams) {
      batch.set(db.collection("teams").doc(team.id), team);
    }
    for (const player of data.players) {
      batch.set(db.collection("players").doc(player.id), player);
    }
    for (const fixture of data.fixtures) {
      batch.set(db.collection("fixtures").doc(fixture.id), fixture);
    }
    for (const ann of data.announcements) {
      batch.set(db.collection("announcements").doc(ann.id), ann);
    }
    batch.set(db.collection("settings").doc("tournament"), data.settings);

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Seeded ${data.teams.length} teams, ${data.players.length} players, ${data.fixtures.length} fixtures to Firestore.`,
      counts: {
        teams: data.teams.length,
        players: data.players.length,
        fixtures: data.fixtures.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: String(error) },
      { status: 500 }
    );
  }
}
