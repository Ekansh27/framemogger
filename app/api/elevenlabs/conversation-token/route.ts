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
    console.log("[ConversationToken] Requesting token for agent:", agentId);

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

    console.log("[ConversationToken] ElevenLabs API response status:", response.status);

    if (!response.ok) {
      const details = await response.text();
      console.error("[ConversationToken] Failed to fetch token:", details);
      return NextResponse.json(
        { 
          error: "Failed to fetch conversation token from ElevenLabs", 
          status: response.status,
          details 
        },
        { status: response.status }
      );
    }

    const body = await response.json();
    console.log("[ConversationToken] Token response has fields:", Object.keys(body));
    
    if (!body?.token) {
      console.error("[ConversationToken] Token missing in response:", body);
      return NextResponse.json({ 
        error: "token missing in response", 
        response: body 
      }, { status: 500 });
    }

    console.log("[ConversationToken] Successfully created token");
    return NextResponse.json({ conversationToken: body.token, agentId });
  } catch (error) {
    console.error("[ConversationToken] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating conversation token", details: String(error) },
      { status: 500 }
    );
  }
}
