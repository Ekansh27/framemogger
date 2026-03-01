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
    console.log("[SignedURL] Requesting signed URL for agent:", agentId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    console.log("[SignedURL] ElevenLabs API response status:", response.status);

    if (!response.ok) {
      const details = await response.text();
      console.error("[SignedURL] Failed to fetch signed URL:", details);
      return NextResponse.json(
        { 
          error: "Failed to fetch signed URL from ElevenLabs", 
          status: response.status,
          details 
        },
        { status: response.status }
      );
    }

    const body = await response.json();
    console.log("[SignedURL] Response has fields:", Object.keys(body));
    
    if (!body?.signed_url) {
      console.error("[SignedURL] Signed URL missing in response:", body);
      return NextResponse.json({ 
        error: "signed_url missing in response", 
        response: body 
      }, { status: 500 });
    }

    console.log("[SignedURL] Successfully created signed URL");
    return NextResponse.json({ signedUrl: body.signed_url, agentId });
  } catch (error) {
    console.error("[SignedURL] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating signed URL", details: String(error) },
      { status: 500 }
    );
  }
}
