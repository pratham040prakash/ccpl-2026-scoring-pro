import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { buildSeedData } from "@/lib/seed";

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

  try {
    const { getFirebaseDb } = await import("@/lib/firebase/config");
    const { doc, setDoc, writeBatch, collection } = await import("firebase/firestore");
    const data = buildSeedData();
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    for (const team of data.teams) {
      batch.set(doc(db, "teams", team.id), team);
    }
    for (const player of data.players) {
      batch.set(doc(db, "players", player.id), player);
    }
    for (const fixture of data.fixtures) {
      batch.set(doc(db, "fixtures", fixture.id), fixture);
    }
    for (const ann of data.announcements) {
      batch.set(doc(db, "announcements", ann.id), ann);
    }
    batch.set(doc(db, "settings", "tournament"), data.settings);

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
