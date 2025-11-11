"use client";

import type { ComponentType } from "react";
import LimitsExplorerBase from "./layouts/LimitsExplorer";

/** Props públicas del tab de Límites (compatibles con tu CalculatorLayout) */
export interface LimitsCalculatorProps {
  functionExpr: string;
  onPointChange?: (p: { x: number; y: number } | null) => void;
  onPathsChange?: (paths: { label: string; points: { x: number; y: number }[] }[]) => void;
}

// Forzamos el tipo del explorer para aceptar las props reenviadas
const LimitsExplorer = LimitsExplorerBase as unknown as ComponentType<LimitsCalculatorProps>;

/**
 * Envoltorio liviano: delega todo en la versión nueva (LimitsExplorer),
 * que ya contiene los paneles correctos de Rutas/Polar y Tolerancias.
 */
export function LimitsCalculator(props: LimitsCalculatorProps) {
  return <LimitsExplorer {...props} />;
}

export default LimitsCalculator;
