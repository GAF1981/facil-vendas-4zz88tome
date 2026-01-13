export function RotaLegend() {
  const items = [
    { color: 'bg-green-800', label: 'Acerto na Rota Atual (Atendido)' },
    { color: 'bg-red-200', label: 'Débito Vencido' },
    { color: 'bg-[#4c1d95]', label: 'x na ROTA > 3' },
  ]

  return (
    <div className="flex flex-wrap gap-4 text-xs mb-2 p-2 bg-muted/20 rounded-lg border">
      <span className="font-semibold text-muted-foreground">
        Legenda (Precedência):
      </span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-sm ${item.color} shadow-sm border border-black/10`}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
