interface Props {
  expr: string
}

export function ResultPanel({ expr }: Props) {
  return (
    <div className="p-4 rounded-md bg-gray-800 text-gray-200">
      <p className="text-sm">
        Aquí se mostrarán los resultados para: <span className="text-blue-400">{expr}</span>
      </p>
    </div>
  )
}
