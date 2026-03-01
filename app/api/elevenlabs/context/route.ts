import { NextRequest, NextResponse } from "next/server";
import { buildAgentContextFromResults, type AgentContextResults } from "@/lib/elevenlabsContext";

export const runtime = "nodejs";

interface ContextRequestBody {
  sessionId?: string;
  results?: AgentContextResults;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY is missing" }, { status: 500 });
    }

    const body = (await req.json()) as ContextRequestBody;
    const sessionId = body.sessionId?.trim();
    const results = body.results;

    if (!sessionId || !results || !Array.isArray(results.persons) || results.persons.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload. Expected sessionId and non-empty results.persons" },
        { status: 400 }
      );
    }

    const analysisContext = buildAgentContextFromResults(results);
    console.log("[ElevenLabsContext] Injecting context", {
      sessionId,
      people: results.persons.length,
      length: analysisContext.length,
    });

    const base = "https://api.elevenlabs.io/v1/convai/conversations";
    const candidates: Array<{ method: "POST" | "PATCH"; url: string; body: Record<string, unknown> }> = [
      {
        method: "POST",
        url: `${base}/${encodeURIComponent(sessionId)}/context`,
        body: { analysis_context: analysisContext, context: analysisContext },
      },
      {
        method: "PATCH",
        url: `${base}/${encodeURIComponent(sessionId)}/metadata`,
        body: { metadata: { ANALYSIS_CONTEXT: analysisContext } },
      },
      {
        method: "POST",
        url: `${base}/${encodeURIComponent(sessionId)}/messages`,
        body: {
          role: "system",
          message:
            "You will receive a context block named ANALYSIS_CONTEXT. Use it to reference each person's scores and ranking.\n\n" +
            analysisContext,
        },
      },
      {
        method: "POST",
        url: `${base}/${encodeURIComponent(sessionId)}/events`,
        body: {
          type: "user_message",
          role: "system",
          message:
            "You will receive a context block named ANALYSIS_CONTEXT. Use it to reference each person's scores and ranking.\n\n" +
            analysisContext,
        },
      },
    ];

    const attempts: Array<{ url: string; status: number; ok: boolean; details?: string }> = [];

    for (const candidate of candidates) {
      const response = await fetch(candidate.url, {
        method: candidate.method,
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(candidate.body),
        cache: "no-store",
      });

      const responseText = await response.text();
      attempts.push({
        url: candidate.url,
        status: response.status,
        ok: response.ok,
        details: responseText.slice(0, 280),
      });

      if (response.ok) {
        console.log("[ElevenLabsContext] Context injected", {
          sessionId,
          endpoint: candidate.url,
          status: response.status,
        });
        return NextResponse.json({
          success: true,
          endpoint: candidate.url,
          status: response.status,
          contextLength: analysisContext.length,
        });
      }
    }

    console.error("[ElevenLabsContext] Failed to inject context", { sessionId, attempts });
    return NextResponse.json(
      {
        error: "Failed to inject analysis context into ElevenLabs session",
        attempts,
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("[ElevenLabsContext] Unexpected error", error);
    return NextResponse.json(
      {
        error: "Unexpected error while injecting ElevenLabs context",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
