"use client"

import React from "react"

interface FunctionInputProps {
  value: string
  onChange: (value: string) => void
}

export const FunctionInput = ({ value, onChange }: FunctionInputProps) => {
  return (
    <div className="flex flex-col gap-2 text-white">
      <label className="text-sm font-medium text-gray-300">
        Expresión matemática (usa x, y)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ejemplo: sin(x) * cos(y)"
        className="p-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
