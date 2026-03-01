"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils";

export function ScanCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => null);
  }, []);

  if (count === null) return null;

  return (
    <p className="text-zinc-400 text-sm tabular-nums">
      <span className="text-zinc-100 font-medium">{formatNumber(count)}</span>
      {" "}frames analyzed
    </p>
  );
}
