import type { PersonSignals } from "@/types/analysis";

export interface AgentContextPerson {
  faceId: string;
  name: string;
  rank: number;
  totalScore: number;
  scores: PersonSignals;
}

export interface AgentContextResults {
  persons: AgentContextPerson[];
  winnerFaceId: string;
  processingTime?: number;
  explanation?: string;
}

const SIGNAL_LABELS: Array<{ key: keyof PersonSignals; label: string }> = [
  { key: "spatial_presence", label: "Spatial Presence" },
  { key: "posture_dominance", label: "Posture Dominance" },
  { key: "facial_intensity", label: "Facial Intensity" },
  { key: "attention_capture", label: "Attention Capture" },
];

export function buildAgentContext(
  persons: AgentContextPerson[],
  names: Record<string, string> = {},
  processingTime?: number,
  explanation?: string,
  explanationLimit = 1000
): string {
  const ranked = [...persons].sort((a, b) => a.rank - b.rank || b.totalScore - a.totalScore);
  const winner = ranked[0];

  const lines: string[] = ["ANALYSIS_CONTEXT", ""];

  if (winner) {
    const winnerName = names[winner.faceId] || winner.name;
    lines.push(`Winner: ${winnerName} (#${winner.rank}, total ${winner.totalScore.toFixed(1)}/100)`);
  } else {
    lines.push("Winner: unavailable");
  }

  if (typeof processingTime === "number") {
    lines.push(`Processing time: ${(processingTime / 1000).toFixed(1)}s`);
  }

  lines.push("", "People summary:");

  for (const person of ranked) {
    const displayName = names[person.faceId] || person.name;
    const entries = SIGNAL_LABELS.map(({ key, label }) => ({
      key,
      label,
      value: person.scores[key],
    })).sort((a, b) => b.value - a.value);

    const strongest = entries[0];
    const weakest = entries[entries.length - 1];

    lines.push(
      `- #${person.rank} ${displayName}: total ${person.totalScore.toFixed(1)}/100 | ` +
        `spatial ${person.scores.spatial_presence}, posture ${person.scores.posture_dominance}, ` +
        `facial ${person.scores.facial_intensity}, attention ${person.scores.attention_capture} | ` +
        `strongest ${strongest.label} (${strongest.value}), weakest ${weakest.label} (${weakest.value})`
    );
  }

  const condensedExplanation = condenseExplanation(explanation, explanationLimit);
  if (condensedExplanation) {
    lines.push("", `Explanation (condensed): ${condensedExplanation}`);
  }

  return lines.join("\n");
}

export function buildAgentContextFromResults(results: AgentContextResults): string {
  const names = Object.fromEntries(results.persons.map((person) => [person.faceId, person.name]));
  return buildAgentContext(results.persons, names, results.processingTime, results.explanation);
}

function condenseExplanation(explanation: string | undefined, maxChars: number): string {
  if (!explanation) return "";
  const compact = explanation.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 1).trim()}…`;
}
