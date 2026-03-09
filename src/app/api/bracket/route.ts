import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchKey, winner } = body as {
      matchKey: string;
      winner: "player1" | "player2";
    };

    if (!matchKey || !winner) {
      return NextResponse.json(
        { error: "Missing or invalid: matchKey, winner" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "dummy", "bracket.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    type Player = { id: number; name: string; phone: string; age: string };
    type MatchEntry = { player1: Player; player2: Player; winnerId?: number; score?: string };
    type RoundEntry = {
      round: number;
      matches: MatchEntry[];
      thirdPlaceMatch?: MatchEntry;
    };
    const data: RoundEntry[] = JSON.parse(raw);

    const [, roundStr, matchStr] = matchKey.match(/^R(\d+)-(\d+)$/) ?? [];
    const roundNum = parseInt(roundStr ?? "0", 10);
    const matchIndex = parseInt(matchStr ?? "0", 10) - 1;

    const round = data.find((r) => r.round === roundNum);
    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const isThirdPlace =
      roundNum === 7 && round.thirdPlaceMatch != null && matchIndex >= round.matches.length;
    const match = isThirdPlace ? round.thirdPlaceMatch : round.matches[matchIndex];

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const winnerId = winner === "player1" ? match.player1.id : match.player2.id;
    const winnerPlayer: Player =
      winner === "player1"
        ? { ...match.player1 }
        : { ...match.player2 };

    match.winnerId = winnerId;

    // Propagate winner to next round (R1→R2, R2→R3, … R6→R7; skip final and 3rd place)
    if (roundNum < 7 && !isThirdPlace) {
      const nextRoundNum = roundNum + 1;
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const slot: "player1" | "player2" = matchIndex % 2 === 0 ? "player1" : "player2";

      const nextRound = data.find((r) => r.round === nextRoundNum);
      if (nextRound && nextRound.matches[nextMatchIndex]) {
        nextRound.matches[nextMatchIndex][slot] = winnerPlayer;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({ ok: true, matchKey, winner });
  } catch (err) {
    console.error("bracket API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update bracket" },
      { status: 500 }
    );
  }
}
