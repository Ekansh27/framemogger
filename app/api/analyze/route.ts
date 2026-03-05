import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildUserPrompt, SYSTEM_PROMPT, DISCLAIMER, recalculateScore } from "@/lib/analyze";
import { compressBase64ImageServer, getBase64ImageSize } from "@/lib/imageCompression";
import type { AnalyzeRequest, AnalysisResult } from "@/types/analysis";

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  maxRetries: 0,
  timeout: 55_000,
});

const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.37;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzeRequest = await req.json();

    if (!body.image || !body.mimeType) {
      return NextResponse.json(
        { success: false, error: "Missing image or mimeType", code: "INVALID_IMAGE" },
        { status: 400 }
      );
    }

    let base64Data = body.image.startsWith("data:")
      ? body.image.split(",")[1]
      : body.image;

    if (base64Data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { success: false, error: "Image too large. Please use an image under 10MB.", code: "INVALID_IMAGE" },
        { status: 413 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("[/api/analyze] ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: API key not set.", code: "AI_ERROR" },
        { status: 500 }
      );
    }

    const names = body.names && body.names.length >= 2 ? body.names : ["Person A", "Person B"];

    console.log(`[/api/analyze] Image size: ${getBase64ImageSize(base64Data).toFixed(2)} MB, people: ${names.length}`);
    base64Data = compressBase64ImageServer(base64Data);

    let message: Awaited<ReturnType<typeof client.messages.create>>;
    try {
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: body.mimeType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: buildUserPrompt(names),
              },
            ],
          },
        ],
      });
    } catch (aiError: unknown) {
      const err = aiError as { status?: number; message?: string };
      console.error("[/api/analyze] Anthropic API error:", err);
      if (err?.status === 401) {
        return NextResponse.json(
          { success: false, error: "API key invalid. Check server configuration.", code: "AI_ERROR" },
          { status: 502 }
        );
      }
      if (err?.status === 404) {
        return NextResponse.json(
          { success: false, error: "AI model not available. Try again later.", code: "AI_ERROR" },
          { status: 502 }
        );
      }
      if (err?.status === 429) {
        return NextResponse.json(
          { success: false, error: "Rate limit reached. Try again in a moment.", code: "RATE_LIMIT" },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: `AI service error: ${err?.message || "Unknown error"}`, code: "AI_ERROR" },
        { status: 502 }
      );
    }

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { success: false, error: "No response from Claude", code: "AI_ERROR" },
        { status: 502 }
      );
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/g, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[/api/analyze] JSON parse failed:", textBlock.text);
      return NextResponse.json(
        { success: false, error: "Failed to parse Claude response", code: "AI_ERROR" },
        { status: 502 }
      );
    }

    if (parsed.error) {
      return NextResponse.json(
        {
          success: false,
          error: (parsed.message as string) || "Could not identify main subjects",
          code: "AI_ERROR",
        },
        { status: 422 }
      );
    }

    // Parse the people array
    const rawPeople = parsed.people as Array<{
      name: string;
      position: string;
      signals: {
        posture_dominance: number;
        spatial_presence: number;
        attention_capture: number;
        facial_intensity: number;
      };
    }>;

    if (!Array.isArray(rawPeople) || rawPeople.length < 2) {
      return NextResponse.json(
        { success: false, error: "Unexpected Claude response format", code: "AI_ERROR" },
        { status: 502 }
      );
    }

    // Recalculate scores server-side — never trust model arithmetic
    const scoredPeople = rawPeople.map((p) => ({
      ...p,
      composite_score: recalculateScore(p.signals),
    }));

    const maxScore = Math.max(...scoredPeople.map((p) => p.composite_score));
    const isTie = scoredPeople.filter((p) => Math.abs(p.composite_score - maxScore) < 1.5).length > 1;
    const winnerIndex = isTie ? 0 : scoredPeople.findIndex((p) => p.composite_score === maxScore);

    // Assign ranks
    const sorted = [...scoredPeople].sort((a, b) => b.composite_score - a.composite_score);

    const result: AnalysisResult = {
      people: scoredPeople.map((p) => ({
        label: p.name,
        position: p.position ?? "center",
        signals: p.signals,
        composite_score: p.composite_score,
        rank: sorted.findIndex((s) => s.name === p.name) + 1,
      })),
      winner_index: winnerIndex,
      is_tie: isTie,
      explanation: (parsed.explanation as string) ?? "",
      disclaimer: DISCLAIMER,
      processing_time_ms: Date.now() - startTime,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("[/api/analyze] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "AI_ERROR" },
      { status: 500 }
    );
  }
}
