import { NextResponse } from "next/server";

const VOTES_API_BASE = "https://votes.kgm-839.workers.dev";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, userId, vote } = body;

    if (!itemId || !userId || !vote) {
      return NextResponse.json(
        { error: "Missing required fields: itemId, userId, vote" },
        { status: 400 }
      );
    }

    if (vote !== "yes" && vote !== "no") {
      return NextResponse.json(
        { error: "Vote must be 'yes' or 'no'" },
        { status: 400 }
      );
    }

    const res = await fetch(`${VOTES_API_BASE}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemId, userId, vote }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Voting failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}
