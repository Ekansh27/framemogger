import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_AGENT_ID = "agent_4801kjkx410df49vbbajszxbb0c4";

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY is missing" }, { status: 500 });
    }

    const agentId = req.nextUrl.searchParams.get("agentId") || process.env.ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Failed to fetch conversation token", details },
        { status: response.status }
      );
    }

    const body = await response.json();
    if (!body?.token) {
      return NextResponse.json({ error: "token missing in response" }, { status: 500 });
    }

    return NextResponse.json({ conversationToken: body.token, agentId });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error creating conversation token", details: String(error) },
      { status: 500 }
    );
  }
}
