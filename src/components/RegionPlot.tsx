"use client";

import { useState } from "react";
import Plot from "react-plotly.js";
import * as math from "mathjs";

interface RegionPlotProps {
  limits: {
    rectangular: {
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
    };
  };
}

export function RegionPlot({ limits }: RegionPlotProps) {
  const { xMin: initialXMin, xMax: initialXMax, yMin: initialYMin, yMax: initialYMax } = limits.rectangular;

  const [functionExpr, setFunctionExpr] = useState<string>("Math.sin(x) * Math.cos(y)");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [xMin, setXMin] = useState(initialXMin);
  const [xMax, setXMax] = useState(initialXMax);
  const [yMin, setYMin] = useState(initialYMin);
  const [yMax, setYMax] = useState(initialYMax);

  const [density, setDensity] = useState<number>(50);

  const [quality, setQuality] = useState<string>("high");

  const pointDensity = quality === "high" ? density : Math.floor(density / 2);

  const xValues = Array.from({ length: pointDensity }, (_, i) => xMin + i * (xMax - xMin) / (pointDensity - 1));
  const yValues = Array.from({ length: pointDensity }, (_, i) => yMin + i * (yMax - yMin) / (pointDensity - 1));

  const zValues: number[][] = yValues.map((y) =>
    xValues.map((x) => {
      try {
        const scope = { x, y };
        return math.evaluate(functionExpr, scope);
      } catch (error) {
        return NaN;
      }
    })
  );

  const handleFunctionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFunction = event.target.value;
    setFunctionExpr(newFunction);

    try {
      math.evaluate(newFunction, { x: 0, y: 0 });
      setError("");
    } catch (e) {
      setError("Expresión inválida");
    }
  };

  const handleDensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDensity(Number(event.target.value));
  };

  const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setQuality(event.target.value);
  };

  const handleXMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (value >= xMax) {
      setError("El valor de X mínimo debe ser menor que X máximo.");
    } else {
      setError("");
      setXMin(value);
    }
  };

  const handleXMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (value <= xMin) {
      setError("El valor de X máximo debe ser mayor que X mínimo.");
    } else {
      setError("");
      setXMax(value);
    }
  };

  const handleYMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (value >= yMax) {
      setError("El valor de Y mínimo debe ser menor que Y máximo.");
    } else {
      setError("");
      setYMin(value);
    }
  };

  const handleYMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (value <= yMin) {
      setError("El valor de Y máximo debe ser mayor que Y mínimo.");
    } else {
      setError("");
      setYMax(value);
    }
  };

  const data: Partial<Plotly.Data>[] = [
    {
      x: xValues,
      y: yValues,
      z: zValues,
      type: "surface",
      colorscale: "Viridis",
      showscale: true,
      opacity: 0.5,
      name: "Región de Integración",
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    autosize: true,
    title: {
      text: "Visualización de la Región de Integración",
      font: { size: 18, family: "Arial, sans-serif" },
      xref: "container",
      x: 0.5,
      xanchor: "center",
    },
    scene: {
      xaxis: { title: { text: "x" } },
      yaxis: { title: { text: "y" } },
      zaxis: { title: { text: "f(x,y)" } },
    },
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center mb-6">Visualización de Función Matemática</h1>

      <div className="mb-4">
        <label htmlFor="functionInput" className="block text-lg">Ingresa la función matemática:</label>
        <input
          id="functionInput"
          type="text"
          value={functionExpr}
          onChange={handleFunctionChange}
          className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>

      <div className="mb-4">
        <label htmlFor="quality" className="block text-lg">Calidad de la visualización:</label>
        <select
          id="quality"
          value={quality}
          onChange={handleQualityChange}
          className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="high">Alta</option>
          <option value="low">Baja</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="density" className="block text-lg">Densidad de puntos:</label>
        <input
          id="density"
          type="range"
          min="10"
          max="200"
          value={density}
          onChange={handleDensityChange}
          className="w-full mt-2"
        />
        <p className="text-center">{`Densidad: ${density}`}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="xMin" className="block text-lg">Límite X Mínimo:</label>
          <input
            id="xMin"
            type="number"
            value={xMin}
            onChange={handleXMinChange}
            className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="xMax" className="block text-lg">Límite X Máximo:</label>
          <input
            id="xMax"
            type="number"
            value={xMax}
            onChange={handleXMaxChange}
            className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="yMin" className="block text-lg">Límite Y Mínimo:</label>
          <input
            id="yMin"
            type="number"
            value={yMin}
            onChange={handleYMinChange}
            className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="yMax" className="block text-lg">Límite Y Máximo:</label>
          <input
            id="yMax"
            type="number"
            value={yMax}
            onChange={handleYMaxChange}
            className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && <div className="text-center text-lg">Cargando...</div>}

      <Plot data={data} layout={layout} />
    </div>
  );
}
