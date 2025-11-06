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
  const { xMin, xMax, yMin, yMax } = limits.rectangular; // Acceso a los límites de la región rectangular

  // Estado para manejar la función ingresada
  const [functionExpr, setFunctionExpr] = useState<string>("Math.sin(x) * Math.cos(y)"); // Valor por defecto

  // Generamos una malla de puntos
  const xValues = Array.from({ length: 50 }, (_, i) => xMin + i * (xMax - xMin) / 50);
  const yValues = Array.from({ length: 50 }, (_, i) => yMin + i * (yMax - yMin) / 50);

  // Generamos los valores z con la función personalizada proporcionada por el usuario
  const zValues: number[][] = yValues.map((y) =>
    xValues.map((x) => {
      try {
        const scope = { x, y }; // Pasamos los valores de x e y como parte del scope
        return math.evaluate(functionExpr, scope); // Evaluamos la expresión matemática
      } catch (error) {
        return NaN; // En caso de error en la evaluación, devolvemos NaN
      }
    })
  );

  // Función para manejar el cambio en el input de la función
  const handleFunctionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFunctionExpr(event.target.value); // Actualiza la función
  };

  // Tipificación explícita para el layout y los datos de Plotly
  const data: Partial<Plotly.Data>[] = [
    {
      x: xValues, // Valores de X
      y: yValues, // Valores de Y
      z: zValues, // Valores de Z (matriz 2D)
      type: "surface", // Tipo de gráfico
      colorscale: "Viridis", // Esquema de colores
      showscale: true, // Mostrar la escala de colores
      opacity: 0.5, // Opacidad del gráfico
      name: "Región de Integración", // Nombre de la región
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    autosize: true,
    title: {
      text: "Visualización de la Región de Integración", // Título como texto
      font: { size: 18, family: "Arial, sans-serif" }, // Estilo de la fuente
      xref: "container", // Posicionamiento en el contenedor
      x: 0.5, // Centrado horizontal
      xanchor: "center", // Anclaje del título
    },
    scene: {
      xaxis: {
        title: { text: "x" }, // Título del eje x como objeto
      },
      yaxis: {
        title: { text: "y" }, // Título del eje y como objeto
      },
      zaxis: {
        title: { text: "f(x,y)" }, // Título del eje z como objeto
      },
    },
  };

  return (
    <div>
      <div>
        <label htmlFor="functionInput">Ingresa la función matemática:</label>
        <input
          id="functionInput"
          type="text"
          value={functionExpr}
          onChange={handleFunctionChange}
          style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
        />
      </div>
      <Plot data={data} layout={layout} />
    </div>
  );
}
