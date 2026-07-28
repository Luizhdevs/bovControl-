'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'

interface PeriodNavProps {
  year:  number
  month: number // 1-12
  from:  string
  to:    string
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export function PeriodNav({ year, month, from, to }: PeriodNavProps) {
  const router = useRouter()

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    const newFrom = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const newTo   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    router.push(`/reports/farm-activity?from=${newFrom}&to=${newTo}`)
  }

  function handlePrint() {
    window.open(`/reports/farm-activity/print?from=${from}&to=${to}`, '_blank')
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="size-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          title="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold min-w-[130px] text-center">
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={() => navigate(+1)}
          className="size-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          title="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <button
        onClick={handlePrint}
        className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Printer className="size-4" />
        Imprimir / Salvar PDF
      </button>
    </div>
  )
}
