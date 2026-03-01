import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const runtime = 'nodejs';

const DEFAULT_VOICE_ID = "TxGEqnHWrfWFTfGW9XjX";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const selectedVoiceId =
      voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

    if (!apiKey) {
      console.error('[TTS] ElevenLabs API key not found');
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    console.log('[TTS] Generating speech for text:', text.substring(0, 100) + '...');

    const client = new ElevenLabsClient({ apiKey });

    // Generate speech using text-to-speech
    const audio = await client.textToSpeech.convert(selectedVoiceId, {
      text: text,
      modelId: "eleven_monolingual_v1",
    });

    console.log('[TTS] Speech generated successfully');

    // Return audio stream as MP3
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('[TTS] Error generating speech:', error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
