"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PersonSignals } from "@/types/analysis";

const RADAR_COLORS = [
  "#2563EB",
  "#64748B",
  "#059669",
  "#EA580C",
  "#6366F1",
  "#E11D48",
];

interface SignalEntry {
  name: string;
  scores: PersonSignals;
}

interface SignalBreakdownProps {
  entries: SignalEntry[];
}

export function SignalBreakdown({ entries }: SignalBreakdownProps) {
  const data = [
    {
      axis: "Spatial",
      ...Object.fromEntries(
        entries.map((e, i) => [`p${i}`, e.scores.spatial_presence])
      ),
    },
    {
      axis: "Posture",
      ...Object.fromEntries(
        entries.map((e, i) => [`p${i}`, e.scores.posture_dominance])
      ),
    },
    {
      axis: "Facial",
      ...Object.fromEntries(
        entries.map((e, i) => [`p${i}`, e.scores.facial_intensity])
      ),
    },
    {
      axis: "Attention",
      ...Object.fromEntries(
        entries.map((e, i) => [`p${i}`, e.scores.attention_capture])
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-[0_20px_56px_-28px_rgba(0,0,0,0.9)] p-6 sm:p-7">
      <div className="mb-4">
        <p className="text-zinc-100 text-lg font-semibold tracking-tight">Signal Profile</p>
        <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
          Four dimensions of frame dominance: spatial presence, posture, facial intensity, and attention capture.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/65 p-3 sm:p-4">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="52%" outerRadius="68%" margin={{ top: 12, right: 24, left: 24, bottom: 8 }}>
          <PolarGrid stroke="#3F3F46" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#D4D4D8", fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip
            contentStyle={{
              background: "#09090B",
              border: "1px solid #3F3F46",
              borderRadius: 12,
              color: "#F4F4F5",
              fontSize: 12,
              boxShadow: "0 12px 24px -16px rgba(0,0,0,0.25)",
            }}
          />
          {entries.map((entry, i) => (
            <Radar
              key={entry.name}
              name={entry.name}
              dataKey={`p${i}`}
              stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
              fill={RADAR_COLORS[i % RADAR_COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={2}
              animationBegin={i * 200}
              animationDuration={700}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#A1A1AA", paddingTop: 10 }}
          />
        </RadarChart>
      </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {entries.map((entry, i) => (
          <span
            key={`${entry.name}-${i}`}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs text-zinc-300"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
            />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}
