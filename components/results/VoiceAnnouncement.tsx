"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import { Mic, PhoneOff } from "lucide-react";
import { buildAgentContextFromResults, type AgentContextResults } from "@/lib/elevenlabsContext";

interface VoiceAnnouncementProps {
  winnerName: string;
  winnerScore: number;
  explanation: string;
  analysisResults: AgentContextResults;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";
type AgentMode = "listening" | "speaking" | "idle";

interface TranscriptLine {
  role: "agent" | "user";
  text: string;
}

const AGENT_ID = "agent_4801kjkx410df49vbbajszxbb0c4";
const CONTEXT_HINT =
  "You will receive a context block named ANALYSIS_CONTEXT. Use it to reference each person's scores and ranking.";

export function VoiceAnnouncement({ winnerName, winnerScore, explanation, analysisResults }: VoiceAnnouncementProps) {
  const conversationRef = useRef<Conversation | null>(null);
  const isStartingRef = useRef(false);
  const manualEndRef = useRef(false);
  const injectedContextKeysRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [mode, setMode] = useState<AgentMode>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextWarning, setContextWarning] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const contextText = buildAgentContextFromResults(analysisResults);
  const contextKey = `${analysisResults.winnerFaceId}:${analysisResults.persons
    .map((person) => `${person.faceId}:${person.rank}:${person.totalScore}`)
    .join("|")}`;

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
    setConversationId(null);
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
    setContextWarning(null);
    setTranscript([]);

    try {
      isStartingRef.current = true;
      setStatus("connecting");
      manualEndRef.current = false;

      console.log("[VoiceAgent] Starting conversation with agent:", AGENT_ID);

      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
      console.log("[VoiceAgent] Microphone permission granted");

      let conversation: Conversation | null = null;

      const tokenRes = await fetch(`/api/elevenlabs/conversation-token?agentId=${encodeURIComponent(AGENT_ID)}`);
      console.log("[VoiceAgent] Token response status:", tokenRes.status);
      
      if (tokenRes.ok) {
        const { conversationToken } = (await tokenRes.json()) as { conversationToken: string };
        console.log("[VoiceAgent] Got conversation token, attempting WebRTC connection...");
        
        try {
          conversation = await Conversation.startSession({
            conversationToken,
            connectionType: "webrtc",
            connectionDelay: {
              default: 250,
              ios: 0,
              android: 500,
            },
            onConnect: ({ conversationId: id }) => {
              console.log("[VoiceAgent] Connected with conversationId:", id);
              setConversationId(id);
            },
            onStatusChange: ({ status: nextStatus }) => {
              console.log("[VoiceAgent] Status change:", nextStatus);
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
              console.log("[VoiceAgent] Disconnect event:", details);
              setStatus("disconnected");
              setMode("idle");
              if (!manualEndRef.current) {
                let reason = "";
                if (details.reason === "error") {
                  reason = `error: ${(details as any).message || "Unknown error"}`;
                } else {
                  reason = details.reason;
                }
                console.log("[VoiceAgent] Setting error:", reason);
                setError(`Session ended (${reason}). If this persists, try refreshing the page.`);
              }
            },
            onModeChange: ({ mode: nextMode }) => {
              console.log("[VoiceAgent] Mode change:", nextMode);
              setMode((nextMode as AgentMode) || "idle");
            },
            onMessage: (message) => {
              console.log("[VoiceAgent] Message received:", message);
              const parsed = parseIncomingMessage(message);
              if (parsed) addTranscript(parsed.role, parsed.text);
            },
            onError: (message, context) => {
              console.log("[VoiceAgent] Error event:", message, context);
              const details = context ? `${message} ${getErrorText(context)}` : message;
              setError(details);
            },
          });
          console.log("[VoiceAgent] WebRTC session created successfully");
        } catch (webrtcErr) {
          console.warn("[VoiceAgent] WebRTC connection failed, attempting fallback:", webrtcErr);
          conversation = null;
        }
      }

      if (!conversation) {
        const signedRes = await fetch(`/api/elevenlabs/signed-url?agentId=${encodeURIComponent(AGENT_ID)}`);
        console.log("[VoiceAgent] Signed URL response status:", signedRes.status);
        
        if (!signedRes.ok) {
          const details = await signedRes.text();
          throw new Error(details || "Could not get signed conversation URL");
        }

        const { signedUrl } = (await signedRes.json()) as { signedUrl: string };
        console.log("[VoiceAgent] Attempting WebSocket connection via signed URL...");

        conversation = await Conversation.startSession({
          signedUrl,
          connectionType: "websocket",
          onConnect: ({ conversationId: id }) => {
            console.log("[VoiceAgent] Connected (WebSocket) with conversationId:", id);
            setConversationId(id);
          },
          onStatusChange: ({ status: nextStatus }) => {
            console.log("[VoiceAgent] Status change (WebSocket):", nextStatus);
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
            console.log("[VoiceAgent] Disconnect event (WebSocket):", details);
            setStatus("disconnected");
            setMode("idle");
            if (!manualEndRef.current) {
              let reason = "";
              if (details.reason === "error") {
                reason = `error: ${(details as any).message || "Unknown error"}`;
              } else {
                reason = details.reason;
              }
              console.log("[VoiceAgent] Setting error:", reason);
              setError(`Session ended (${reason}). If this persists, try refreshing the page.`);
            }
          },
          onModeChange: ({ mode: nextMode }) => {
            console.log("[VoiceAgent] Mode change (WebSocket):", nextMode);
            setMode((nextMode as AgentMode) || "idle");
          },
          onMessage: (message) => {
            console.log("[VoiceAgent] Message received (WebSocket):", message);
            const parsed = parseIncomingMessage(message);
            if (parsed) addTranscript(parsed.role, parsed.text);
          },
          onError: (message, context) => {
            console.log("[VoiceAgent] Error event (WebSocket):", message, context);
            const details = context ? `${message} ${getErrorText(context)}` : message;
            setError(details);
          },
        });
        console.log("[VoiceAgent] WebSocket session created successfully");
      }

      if (conversation) {
        addTranscript(
          "user",
          `${CONTEXT_HINT}\n\n${contextText}\n\nReview this analysis result: ${winnerName} won with a score of ${winnerScore.toFixed(1)}. Summary: ${explanation}`
        );
        conversationRef.current = conversation;
        console.log("[VoiceAgent] Conversation started, awaiting agent response");
      } else {
        throw new Error("Failed to establish conversation (both WebRTC and WebSocket failed)");
      }
    } catch (err) {
      setStatus("disconnected");
      setMode("idle");
      const errorMsg = err instanceof Error ? err.message : "Failed to start conversation";
      console.error("[VoiceAgent] Error:", errorMsg);
      setError(errorMsg);
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      endConversation(true).catch(() => undefined);
    };
  }, [endConversation]);

  useEffect(() => {
    if (status !== "connected" || !conversationId) return;

    const injectionKey = `${conversationId}::${contextKey}`;
    if (injectedContextKeysRef.current.has(injectionKey)) return;

    injectedContextKeysRef.current.add(injectionKey);

    const inject = async () => {
      try {
        const response = await fetch("/api/elevenlabs/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: conversationId,
            results: analysisResults,
          }),
        });

        if (!response.ok) {
          const details = await response.text();
          console.warn("[VoiceAgent] Voice context unavailable", {
            conversationId,
            status: response.status,
            details,
          });
          setContextWarning("Voice context unavailable");
          return;
        }

        const payload = await response.json();
        console.log("[VoiceAgent] Context injected successfully", payload);
        setContextWarning(null);
      } catch (injectError) {
        console.warn("[VoiceAgent] Voice context unavailable", injectError);
        setContextWarning("Voice context unavailable");
      }
    };

    void inject();
  }, [analysisResults, contextKey, conversationId, status]);

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">ElevenLabs · Clavicular Voice Agent</p>
          <p className="text-zinc-200 text-sm mt-1">
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
          {status === "connected" ? "End ElevenLabs call" : "Consult Clavicular"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {!error && contextWarning && (
        <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">{contextWarning}</p>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 max-h-44 overflow-y-auto space-y-2">
        {transcript.length === 0 ? (
          <p className="text-xs text-zinc-500">Press Consult Clavicular, allow microphone access, and start speaking.</p>
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
