"use client";

import LimitsExplorer from "./layouts/LimitsExplorer";

/** Props públicas del tab de Límites (compatibles con tu CalculatorLayout) */
export interface LimitsCalculatorProps {
  functionExpr: string;
  onPointChange?: (point: { x: number; y: number } | null) => void;
}

/**
 * Mantiene el nombre exportado "LimitsCalculator" y reenvía
 * las props hacia el componente real (LimitsExplorer).
 */
export function LimitsCalculator({
  functionExpr,
  onPointChange,
}: LimitsCalculatorProps) {
  return (
    <LimitsExplorer
      functionExpr={functionExpr}
      onPointChange={onPointChange}
    />
  );
}

export default LimitsCalculator;
