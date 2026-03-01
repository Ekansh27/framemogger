"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import { Mic, PhoneOff } from "lucide-react";

interface VoiceAnnouncementProps {
  winnerName: string;
  winnerScore: number;
  explanation: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";
type AgentMode = "listening" | "speaking" | "idle";

interface TranscriptLine {
  role: "agent" | "user";
  text: string;
}

const AGENT_ID = "agent_4801kjkx410df49vbbajszxbb0c4";

export function VoiceAnnouncement({ winnerName, winnerScore, explanation }: VoiceAnnouncementProps) {
  const conversationRef = useRef<Conversation | null>(null);
  const isStartingRef = useRef(false);
  const manualEndRef = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [mode, setMode] = useState<AgentMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const addTranscript = (role: "agent" | "user", text: string) => {
    if (!text.trim()) return;
    setTranscript((prev) => [...prev.slice(-7), { role, text }]);
  };

  const parseIncomingMessage = (message: unknown) => {
    if (!message || typeof message !== "object") return null;
    const payload = message as Record<string, unknown>;

    const source = typeof payload.source === "string" ? payload.source : "agent";
    const textCandidates = [payload.text, payload.message, payload.transcript, payload.content];
    const text = textCandidates.find((value) => typeof value === "string") as string | undefined;

    if (!text) return null;
    return {
      role: source === "user" ? "user" : "agent",
      text,
    } as TranscriptLine;
  };

  const getErrorText = (event: unknown): string => {
    if (typeof event === "string") return event;
    if (event instanceof Error) return event.message;
    if (event && typeof event === "object") {
      const payload = event as Record<string, unknown>;
      const message = [payload.message, payload.error, payload.reason].find(
        (value) => typeof value === "string"
      ) as string | undefined;
      if (message) return message;
      try {
        return JSON.stringify(payload);
      } catch {
        return "Conversation error";
      }
    }
    return "Conversation error";
  };

  const endConversation = useCallback(async (manual = false) => {
    manualEndRef.current = manual;
    const conversation = conversationRef.current;
    if (conversation) {
      try {
        await conversation.endSession();
      } catch {
        // no-op
      }
    }
    conversationRef.current = null;
    setStatus("disconnected");
    setMode("idle");
    if (manual) {
      setError(null);
    }
    manualEndRef.current = false;
  }, []);

  const askExpert = async () => {
    if (isStartingRef.current) return;

    if (status === "connected" && conversationRef.current) {
      await endConversation(true);
      return;
    }

    setError(null);
    setTranscript([]);

    try {
      isStartingRef.current = true;
      setStatus("connecting");
      manualEndRef.current = false;

      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());

      let conversation: Conversation | null = null;

      const tokenRes = await fetch(`/api/elevenlabs/conversation-token?agentId=${encodeURIComponent(AGENT_ID)}`);
      if (tokenRes.ok) {
        const { conversationToken } = (await tokenRes.json()) as { conversationToken: string };
        conversation = await Conversation.startSession({
          conversationToken,
          connectionType: "webrtc",
          connectionDelay: {
            default: 250,
            ios: 0,
            android: 500,
          },
          onStatusChange: ({ status: nextStatus }) => {
            if (nextStatus === "connected") {
              setStatus("connected");
              return;
            }

            if (nextStatus === "connecting") {
              setStatus("connecting");
              return;
            }

            setStatus("disconnected");
            setMode("idle");
          },
          onDisconnect: (details) => {
            setStatus("disconnected");
            setMode("idle");
            if (!manualEndRef.current) {
              const reason = details.reason === "error"
                ? `${details.reason}: ${details.message}`
                : details.reason;
              setError(`Session ended (${reason})`);
            }
          },
          onModeChange: ({ mode: nextMode }) => setMode((nextMode as AgentMode) || "idle"),
          onMessage: (message) => {
            const parsed = parseIncomingMessage(message);
            if (parsed) addTranscript(parsed.role, parsed.text);
          },
          onError: (message, context) => {
            const details = context ? `${message} ${getErrorText(context)}` : message;
            setError(details);
          },
          overrides: {
            agent: {
              firstMessage: `I have the winner and analysis ready. Winner: ${winnerName} (${winnerScore.toFixed(1)}). Analysis summary: ${explanation}. Give your expert verdict.`,
            },
          },
        });
      }

      if (!conversation) {
        const signedRes = await fetch(`/api/elevenlabs/signed-url?agentId=${encodeURIComponent(AGENT_ID)}`);
        if (!signedRes.ok) {
          const details = await signedRes.text();
          throw new Error(details || "Could not get signed conversation URL");
        }

        const { signedUrl } = (await signedRes.json()) as { signedUrl: string };

        conversation = await Conversation.startSession({
          signedUrl,
          connectionType: "websocket",
          onStatusChange: ({ status: nextStatus }) => {
            if (nextStatus === "connected") {
              setStatus("connected");
              return;
            }

            if (nextStatus === "connecting") {
              setStatus("connecting");
              return;
            }

            setStatus("disconnected");
            setMode("idle");
          },
          onDisconnect: (details) => {
            setStatus("disconnected");
            setMode("idle");
            if (!manualEndRef.current) {
              const reason = details.reason === "error"
                ? `${details.reason}: ${details.message}`
                : details.reason;
              setError(`Session ended (${reason})`);
            }
          },
          onModeChange: ({ mode: nextMode }) => setMode((nextMode as AgentMode) || "idle"),
          onMessage: (message) => {
            const parsed = parseIncomingMessage(message);
            if (parsed) addTranscript(parsed.role, parsed.text);
          },
          onError: (message, context) => {
            const details = context ? `${message} ${getErrorText(context)}` : message;
            setError(details);
          },
          overrides: {
            agent: {
              firstMessage: `I have the winner and analysis ready. Winner: ${winnerName} (${winnerScore.toFixed(1)}). Analysis summary: ${explanation}. Give your expert verdict.`,
            },
          },
        });
      }

      addTranscript(
        "user",
        `Clavicular, review this result: ${winnerName} won with ${winnerScore.toFixed(1)}. Analysis: ${explanation}`
      );

      conversationRef.current = conversation;
    } catch (err) {
      setStatus("disconnected");
      setMode("idle");
      setError(err instanceof Error ? err.message : "Failed to start conversation");
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      endConversation(true).catch(() => undefined);
    };
  }, [endConversation]);

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">ElevenLabs · Clavicular Voice Agent</p>
          <p className="text-zinc-300 text-sm">
            Status: <span className="font-medium text-violet-300">{status}</span>
            {status === "connected" ? ` · ${mode}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={askExpert}
          disabled={status === "connecting"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white text-sm font-semibold transition-colors"
        >
          {status === "connected" ? <PhoneOff size={16} /> : <Mic size={16} />}
          {status === "connected" ? "End ElevenLabs call" : "Consult ElevenLabs agent"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 max-h-44 overflow-y-auto space-y-2">
        {transcript.length === 0 ? (
          <p className="text-xs text-zinc-500">Press Consult ElevenLabs agent, allow microphone access, and start speaking.</p>
        ) : (
          transcript.map((line, index) => (
            <p key={`${line.role}-${index}`} className="text-sm text-zinc-300">
              <span className={line.role === "agent" ? "text-violet-300 font-medium" : "text-cyan-300 font-medium"}>
                {line.role === "agent" ? "Clavicular" : "You"}:
              </span>{" "}
              {line.text}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
