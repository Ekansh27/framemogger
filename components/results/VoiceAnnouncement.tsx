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
type ContextStatus = "idle" | "injecting" | "ready" | "failed";

interface TranscriptLine {
  role: "agent" | "user";
  text: string;
}

const AGENT_ID = "agent_4801kjkx410df49vbbajszxbb0c4";
const STARTER_USER_PROMPT =
  "Summarize each person by name, rank, total score, and all four signal scores before answering follow-up questions.";

export function VoiceAnnouncement({ winnerName, winnerScore, explanation, analysisResults }: VoiceAnnouncementProps) {
  const conversationRef = useRef<Conversation | null>(null);
  const isStartingRef = useRef(false);
  const manualEndRef = useRef(false);
  const injectedContextKeysRef = useRef<Set<string>>(new Set());
  const attemptedInjectionKeysRef = useRef<Set<string>>(new Set());
  const promptedSessionKeysRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [mode, setMode] = useState<AgentMode>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextStatus, setContextStatus] = useState<ContextStatus>("idle");
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [contextRetryCount, setContextRetryCount] = useState(0);
  const [fallbackModeActive, setFallbackModeActive] = useState(false);
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
    setContextStatus("idle");
    setContextMessage(null);
    if (manual) {
      setError(null);
    }
    manualEndRef.current = false;
  }, []);

  const sendUserMessageWithFallback = useCallback(
    (message: string) => {
      const conversation = conversationRef.current;
      if (!conversation) {
        throw new Error("No active conversation to send message");
      }

      const shouldPrependFallback = contextStatus !== "ready";
      const payload = shouldPrependFallback
        ? `ANALYSIS CONTEXT:\n${contextText}\n\nUSER QUESTION:\n${message}`
        : message;

      conversation.sendUserMessage(payload);
      addTranscript("user", message);
    },
    [contextStatus, contextText]
  );

  const sendStarterPrompt = useCallback(() => {
    if (status !== "connected" || !conversationRef.current || !conversationId) return;

    const promptKey = `${conversationId}::${contextKey}`;
    if (promptedSessionKeysRef.current.has(promptKey)) return;

    try {
      sendUserMessageWithFallback(STARTER_USER_PROMPT);
      promptedSessionKeysRef.current.add(promptKey);
      if (contextStatus !== "ready") {
        setFallbackModeActive(true);
        if (!contextMessage) {
          setContextMessage("Session context API unavailable; using safe prepend fallback.");
        }
      }
    } catch (sendError) {
      const details = sendError instanceof Error ? sendError.message : "Unknown send error";
      console.error("[VoiceAgent] Failed to send starter prompt", details);
      setError(`Voice context unavailable: injection and fallback failed (${details})`);
      setContextMessage("Voice context unavailable");
    }
  }, [contextKey, contextMessage, contextStatus, conversationId, sendUserMessageWithFallback, status]);

  const askExpert = async () => {
    if (isStartingRef.current) return;

    if (status === "connected" && conversationRef.current) {
      await endConversation(true);
      return;
    }

    setError(null);
    setContextMessage(null);
    setContextStatus("idle");
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
        const derivedId = conversation.getId?.() || null;
        if (derivedId) {
          setConversationId(derivedId);
        }
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
    if (injectedContextKeysRef.current.has(injectionKey)) {
      setContextStatus("ready");
      setContextMessage("Voice context ready");
      return;
    }

    if (attemptedInjectionKeysRef.current.has(injectionKey)) return;
    attemptedInjectionKeysRef.current.add(injectionKey);
    setContextStatus("injecting");
    setContextMessage("Injecting analysis context...");

    const inject = async () => {
      try {
        const response = await fetch("/api/agent/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: conversationId,
            contextText,
          }),
        });

        if (!response.ok) {
          const details = await response.text();
          console.warn("[VoiceAgent] Context injection failed", {
            conversationId,
            status: response.status,
            details,
          });
          setContextStatus("failed");
          setFallbackModeActive(true);
          setContextMessage("Context injection failed. Using safe prepend fallback.");
          sendStarterPrompt();
          return;
        }

        const payload = (await response.json()) as { ok?: boolean };
        if (!payload.ok) {
          setContextStatus("failed");
          setFallbackModeActive(true);
          setContextMessage("Context injection failed. Using safe prepend fallback.");
          sendStarterPrompt();
          return;
        }

        console.log("[VoiceAgent] Context injected successfully", payload);
        injectedContextKeysRef.current.add(injectionKey);
        setContextStatus("ready");
        setContextMessage("Voice context ready");
        try {
          conversationRef.current?.sendContextualUpdate(contextText);
        } catch {
          // no-op
        }
        sendStarterPrompt();
      } catch (injectError) {
        console.warn("[VoiceAgent] Context injection error", injectError);
        setContextStatus("failed");
        setFallbackModeActive(true);
        setContextMessage("Context injection failed. Using safe prepend fallback.");
        sendStarterPrompt();
      }
    };

    void inject();
  }, [contextKey, contextRetryCount, contextText, conversationId, sendStarterPrompt, status]);

  useEffect(() => {
    if (status !== "connected") return;
    if (!conversationId) return;
    if (contextStatus !== "ready" && contextStatus !== "failed") return;
    sendStarterPrompt();
  }, [contextStatus, conversationId, sendStarterPrompt, status]);

  const retryContextInjection = () => {
    if (!conversationId) {
      setContextMessage("No active session id. Fallback prepend mode remains active.");
      return;
    }
    const injectionKey = `${conversationId}::${contextKey}`;
    attemptedInjectionKeysRef.current.delete(injectionKey);
    setFallbackModeActive(false);
    setContextStatus("idle");
    setContextMessage("Retrying context injection...");
    setContextRetryCount((prev) => prev + 1);
  };

  const effectiveContextReady = contextStatus === "ready" || fallbackModeActive;
  const canPressPrimary = status === "disconnected" || status === "connected" ? true : effectiveContextReady;

  return (
    <section className="rounded-2xl border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">ElevenLabs · Voice Analyst</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`text-[11px] px-2 py-1 rounded-full border ${status === "connected" ? "text-amber-200 border-amber-500/30 bg-amber-500/10" : "text-stone-300 border-stone-700 bg-stone-900/70"}`}>
              {status === "connected" ? "Connected" : "Disconnected"}
            </span>
            <span className={`text-[11px] px-2 py-1 rounded-full border ${effectiveContextReady ? "text-orange-200 border-orange-500/30 bg-orange-500/10" : "text-amber-200 border-amber-500/30 bg-amber-500/10"}`}>
              {effectiveContextReady ? "Context Ready" : "Context Not Ready"}
            </span>
            {status === "connected" && <span className="text-[11px] px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200">{mode}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={askExpert}
          disabled={status === "connecting" || !canPressPrimary}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 text-white text-sm font-semibold transition-colors"
        >
          {status === "connected" ? <PhoneOff size={16} /> : <Mic size={16} />}
          {status === "connected" ? "End call" : "Consult Voice Analyst"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {!error && contextMessage && (
        <div className="flex items-center justify-between gap-2 text-xs text-stone-200 bg-stone-950/50 border border-stone-800 rounded-lg px-3 py-2">
          <span>{contextMessage}</span>
          {status === "connected" && contextStatus === "failed" && (
            <button
              type="button"
              onClick={retryContextInjection}
              className="shrink-0 px-2 py-1 rounded-md border border-orange-500/30 text-orange-200 hover:bg-orange-500/10"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3 max-h-44 overflow-y-auto space-y-2">
        {transcript.length === 0 ? (
          <p className="text-xs text-stone-500">Press Consult Voice Analyst, allow microphone access, and start speaking.</p>
        ) : (
          transcript.map((line, index) => (
            <p key={`${line.role}-${index}`} className="text-sm text-stone-300">
              <span className={line.role === "agent" ? "text-amber-400 font-medium" : "text-stone-400 font-medium"}>
                {line.role === "agent" ? "Analyst" : "You"}:
              </span>{" "}
              {line.text}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
