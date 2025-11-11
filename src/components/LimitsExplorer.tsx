import React, { useMemo } from "react";
import { tols } from "./tols";

// Tipos (ajusta si ya existen en otro archivo)
type VerdictStatus = "exists" | "diverges" | "inconclusive";
type Verdict = { status: VerdictStatus; value: number | null; spread: number };
type LimitPath = { label: string; points: { x: number; y: number }[]; status?: "converge" | "diverge" | "unknown" };

const result = useMemo((): { verdict: Verdict; paths: LimitPath[] } => {
  if (!compiled) {
    return { verdict: { status: "inconclusive", value: null, spread: Number.NaN }, paths: [] };
  }

  // ...existing code...
  // calcula conv, spreadAll, paths, etc.

  const verdict: Verdict =
    spreadAll < tols.epsilon
      ? { status: "exists", value: conv[0], spread: spreadAll }
      : { status: "inconclusive", value: conv[0], spread: spreadAll };

  return { verdict, paths };
}, [compiled, x0, y0, routes, tols]);

export default result;