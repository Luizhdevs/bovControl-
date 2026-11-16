import { redirect }      from 'next/navigation'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { getEmptyCowsLate } from '@/modules/reports/queries'
import { MilkOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReportsNav } from '../reports-nav'

export const metadata = { title: 'Vacas Vazias Atrasadas | BovControl' }

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-3 py-2.5 text-sm border-b border-border/50 align-top', className)}>
      {children}
    </td>
  )
}

const INSEM_LABEL: Record<string, string> = {
  INSEMINATION:   'IA',
  NATURAL_MATING: 'Monta',
}

export default async function EmptyCowsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const rows = await getEmptyCowsLate(activeFarm.farmId)

  // Classificação de urgência por dias em aberto
  function urgencyColor(days: number) {
    if (days >= 150) return 'text-red-500'
    if (days >= 90)  return 'text-amber-500'
    return 'text-foreground'
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MilkOff className="size-5 text-amber-500" />
            Vacas Vazias Atrasadas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Em lactação há mais de 60 dias sem confirmar prenhez
          </p>
        </div>
        <ReportsNav active="empty-cows" />
      </div>

      {/* Resumo */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500">
          <AlertTriangle className="size-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
            {rows.length === 1 ? 'vaca vazia atrasada' : 'vacas vazias atrasadas'}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-7 rounded-lg flex items-center justify-center bg-amber-500">
            <MilkOff className="size-4 text-white" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wide">Listagem</h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {rows.length} animal{rows.length !== 1 ? 'is' : ''}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground italic">
            Nenhuma vaca com mais de 60 dias em aberto no momento.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Animal</Th>
                  <Th>Lote</Th>
                  <Th>Último parto</Th>
                  <Th>Dias em aberto</Th>
                  <Th>Última IA / Monta</Th>
                  <Th>Tentativas</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <Td>
                      <span className="font-mono font-semibold text-primary">{row.tag}</span>
                      {row.name && (
                        <span className="text-muted-foreground ml-1.5 text-xs">· {row.name}</span>
                      )}
                    </Td>
                    <Td className="text-muted-foreground text-xs">{row.lotName ?? '—'}</Td>
                    <Td className="whitespace-nowrap font-mono text-xs">
                      {fmtDate(row.lastCalvingDate)}
                    </Td>
                    <Td>
                      <span className={cn('font-bold tabular-nums', urgencyColor(row.daysEmpty))}>
                        {row.daysEmpty}d
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs">
                      {row.lastInsemDate ? (
                        <>
                          <span className="font-mono text-muted-foreground">
                            {fmtDate(row.lastInsemDate)}
                          </span>
                          {row.lastInsemType && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              · {INSEM_LABEL[row.lastInsemType] ?? row.lastInsemType}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-red-500 font-medium">Sem IA</span>
                      )}
                    </Td>
                    <Td className="text-xs text-muted-foreground tabular-nums">
                      {row.insemCount === 0 ? (
                        <span className="text-red-500 font-medium">0</span>
                      ) : (
                        row.insemCount
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-amber-500 mr-1 align-middle" />
            Laranja = 90–149 dias em aberto ·{' '}
            <span className="inline-block size-2 rounded-full bg-red-500 mr-1 align-middle" />
            Vermelho = 150+ dias
          </p>
        )}
      </div>
    </div>
  )
}
