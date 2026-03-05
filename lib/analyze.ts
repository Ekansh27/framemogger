import type { PersonSignals } from "@/types/analysis";

export const SYSTEM_PROMPT = `You are a visual frame dominance analyst. You analyze photographs to determine who commands the frame more powerfully.

Visual dominance signals (in order of importance):
1. POSTURE DOMINANCE (40% weight): Body orientation — upright vs. slouched, expansive vs. contracted, squared-up vs. turned away, how they physically carry themselves
2. FACIAL INTENSITY (30% weight): Eye contact direction, expression strength, face visibility, gaze confidence
3. SPATIAL PRESENCE (15% weight): How much of the frame they occupy — area, depth, centrality, foreground vs. background
4. ATTENTION CAPTURE (15% weight): Where the eye is pulled — contrast, lighting, compositional placement, visual weight

SCORING RULES:
- Score each signal 0–100 independently for each person
- If one person clearly dominates a signal, the gap MUST reflect it (expect 15–35 point differences)
- Do NOT artificially converge scores — people rarely perform identically
- A tie should only happen when they are genuinely equivalent

Respond ONLY with valid JSON. No markdown, no prose outside the JSON.`;

export const DISCLAIMER =
  "This analysis is based on photographic composition signals only (spatial presence, posture, facial orientation, and attention capture). It does not reflect personal worth, attractiveness, social status, or any subjective judgment.";

export function buildUserPrompt(names: string[]): string {
  const count = names.length;

  const posLabels: Record<number, string[]> = {
    2: ["LEFT half", "RIGHT half"],
    3: ["left third", "center", "right third"],
    4: ["far left", "center-left", "center-right", "far right"],
    5: ["far left", "left-center", "center", "right-center", "far right"],
    6: ["position 1 (leftmost)", "position 2", "position 3", "position 4", "position 5", "position 6 (rightmost)"],
  };
  const labels = posLabels[count] ?? names.map((_, i) => `position ${i + 1} from left`);

  const assignments = names
    .map((name, i) => `- "${name}" = the most prominent person in the ${labels[i]} of the frame`)
    .join("\n");

  const schemaPerson = (name: string) => ({
    name,
    position: "<left|center|right>",
    signals: {
      posture_dominance: "<integer 0-100>",
      spatial_presence: "<integer 0-100>",
      attention_capture: "<integer 0-100>",
      facial_intensity: "<integer 0-100>",
    },
  });

  const schema = {
    people: names.map(schemaPerson),
    winner: `<exact name of the overall winner — one of: ${names.join(", ")}>`,
    explanation: `<1–2 sharp sentences naming the people by name, referencing body language and frame presence. Neutral tone, no mention of attractiveness.>`,
    disclaimer: "",
  };

  return `Analyze this photograph. Identify the ${count} most visually prominent people from left to right.

${assignments}

Score each person on the 4 dominance signals. Use their exact names in the explanation — never use generic labels.

If you cannot identify ${count} clearly distinct main-subject people, respond with:
{"error": "NOT_TWO_PEOPLE", "message": "<reason>"}

Otherwise respond with JSON exactly matching this schema:
${JSON.stringify(schema, null, 2)}`;
}

export function recalculateScore(signals: PersonSignals): number {
  return (
    Math.round(
      (signals.posture_dominance * 0.40 +
        signals.facial_intensity  * 0.30 +
        signals.spatial_presence  * 0.15 +
        signals.attention_capture * 0.15) *
        10
    ) / 10
  );
}
