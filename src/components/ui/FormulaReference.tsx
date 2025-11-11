import React from "react";

// Usa KaTeX si está disponible; si no, cae a <code>
let Katex: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Katex = require("katex");
} catch {}

type Row = { label?: string; tex: string };

export function FormulaReference({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-sm">
      <div className="mb-2 text-xs font-semibold text-blue-300">{title}</div>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            {r.label && <div className="min-w-[10rem] text-gray-400">{r.label}</div>}
            {Katex ? (
              <div
                className="text-gray-100"
                dangerouslySetInnerHTML={{
                  __html: Katex.renderToString(r.tex, { throwOnError: false }),
                }}
              />
            ) : (
              <code className="font-mono text-gray-200">{r.tex}</code>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FormulaReference;