"use client";

import * as React from "react";

export type SliderProps = {
  /** Usamos el mismo contrato que shadcn: un array con un único número */
  value: number[];
  onValueChange?: (val: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
};

/**
 * Shim de Slider basado en <input type="range">.
 * Mantiene la API de shadcn/ui (value:number[], onValueChange(number[])).
 * Si luego agregas el Slider real de shadcn, solo reemplazas este archivo.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = "",
}: SliderProps) {
  const v = Number(Array.isArray(value) ? value[0] : value ?? 0);

  return (
    <input
      type="range"
      value={Number.isFinite(v) ? v : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={
        // estilos sencillos; ajústalos a tu theme
        "w-full h-2 rounded-lg appearance-none cursor-pointer " +
        "bg-gray-700 accent-blue-500 " +
        className
      }
    />
  );
}

export default Slider;
