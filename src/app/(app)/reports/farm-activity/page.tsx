import { redirect }       from 'next/navigation'
import { auth }           from '@/lib/auth'
import { getActiveFarm }  from '@/lib/active-farm'
import { getFarmActivityReport } from '@/modules/reports/queries'
import { PeriodNav }      from './period-nav'
import {
  Baby, Droplets, AlertTriangle, Heart,
  Stethoscope, Bell, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Labels ──────────────────────────────────────────────

const HEALTH_LABELS: Record<string, string> = {
  VACCINATION: 'Vacinação',
  DISEASE:     'Enfermidade',
  DEWORMING:   'Vermifugação',
  EXAM:        'Exame',
  MEDICATION:  'Medicação',
  MASTITIS:    'Mamite',
  OTHER:       'Outro',
}

const REPRO_TYPE_LABELS: Record<string, string> = {
  INSEMINATION:    'Inseminação',
  NATURAL_MATING:  'Monta Natural',
  PREGNANCY_CHECK: 'Diagnóstico de Gestação',
}

const REPRO_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendente',
  CONFIRMED: 'Confirmado',
  FAILED:    'Não confirmado',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  CALVING_OVERDUE:    'Parto vencido',
  CALVING_SOON:       'Parto próximo',
  DRY_OFF_DUE:        'Secar vaca',
  HIGH_CCS:           'CCS elevado',
  MASTITIS_FOLLOW_UP: 'Acompan. mamite',
  DISCARD_REVIEW:     'Revisão de descarte',
  EMPTY_COW_LATE:     'Vaca vazia atrasada',
  PREGNANCY_CHECK_DUE:'Diag. gestação pendente',
}

const ALERT_PRIORITY_LABELS: Record<string, string> = {
  HIGH:   'Alta',
  MEDIUM: 'Média',
  LOW:    'Baixa',
}

// ─── Helpers ─────────────────────────────────────────────

function fmtDate(d: Date | string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function animalLabel(tag: string, name: string | null) {
  return name ? `${tag} · ${name}` : tag
}

// ─── Componentes de seção ─────────────────────────────────

function SummaryCard({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: React.ElementType
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 flex items-start gap-3', value === 0 && 'opacity-60')}>
      <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function SectionHeader({ title, count, color, icon: Icon }: {
  title: string; count: number; color: string; icon: React.ElementType
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn('size-7 rounded-lg flex items-center justify-center', color)}>
        <Icon className="size-4 text-white" />
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count} registro{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={99} className="py-6 text-center text-sm text-muted-foreground italic">
        Nenhum registro neste período
      </td>
    </tr>
  )
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

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default async function FarmActivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const sp    = await searchParams
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  // Defaults: mês atual
  const fromStr = sp.from ?? `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(
    parseInt(fromStr.slice(0, 4)),
    parseInt(fromStr.slice(5, 7)),
    0,
  ).getDate()
  const monthNum = parseInt(fromStr.slice(5, 7))
  const yearNum  = parseInt(fromStr.slice(0, 4))
  const toStr  = sp.to ?? `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const from = new Date(fromStr + 'T00:00:00')
  const to   = new Date(toStr   + 'T23:59:59')

  const report = await getFarmActivityReport(activeFarm.farmId, from, to)

  const totalEvents =
    report.partos.length + report.secagens.length + report.abortos.length +
    report.saude.length  + report.reproducao.length

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Relatório de Movimentação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {report.farmName} · Eventos da fazenda por período
          </p>
        </div>

        {/* Navegação de período + botão imprimir */}
        <PeriodNav year={yearNum} month={monthNum} from={fromStr} to={toStr} />
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <SummaryCard label="Partos"               value={report.partos.length}     color="bg-violet-500" icon={Baby}          />
        <SummaryCard label="Secagens"             value={report.secagens.length}   color="bg-amber-500"  icon={Droplets}      />
        <SummaryCard label="Abortos"              value={report.abortos.length}    color="bg-rose-600"   icon={AlertTriangle} />
        <SummaryCard label="Eventos de Saúde"     value={report.saude.length}      color="bg-red-500"    icon={Stethoscope}   />
        <SummaryCard label="Reprodução"           value={report.reproducao.length} color="bg-pink-500"   icon={Heart}         />
        <SummaryCard label="Alertas do período"   value={report.alertas.length}    color="bg-orange-500" icon={Bell}          />
      </div>

      {totalEvents === 0 && report.alertas.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhum evento registrado neste período.
        </div>
      )}

      {/* Partos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader title="Partos" count={report.partos.length} color="bg-violet-500" icon={Baby} />
        <Table>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Mãe</Th>
              <Th>Lote</Th>
              <Th>Bezerro</Th>
              <Th>Sexo</Th>
            </tr>
          </thead>
          <tbody>
            {report.partos.length === 0 ? <EmptyRow /> : report.partos.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDate(p.date)}</Td>
                <Td><span className="font-mono font-semibold text-primary">{p.motherTag}</span>{p.motherName && <span className="text-muted-foreground ml-1.5 text-xs">· {p.motherName}</span>}</Td>
                <Td className="text-muted-foreground text-xs">{p.lotName ?? '—'}</Td>
                <Td>{p.calveTag ? <span className="font-mono font-semibold">{p.calveTag}</span> : '—'}{p.calveName && <span className="text-muted-foreground ml-1.5 text-xs">· {p.calveName}</span>}</Td>
                <Td className="text-xs">{p.calveSex === 'FEMALE' ? 'Fêmea ♀' : p.calveSex === 'MALE' ? 'Macho ♂' : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Secagens */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader title="Secagens" count={report.secagens.length} color="bg-amber-500" icon={Droplets} />
        <Table>
          <thead>
            <tr><Th>Data</Th><Th>Animal</Th><Th>Lote</Th><Th>Observações</Th></tr>
          </thead>
          <tbody>
            {report.secagens.length === 0 ? <EmptyRow /> : report.secagens.map(s => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDate(s.occurredAt)}</Td>
                <Td><span className="font-mono font-semibold text-primary">{s.animalTag}</span>{s.animalName && <span className="text-muted-foreground ml-1.5 text-xs">· {s.animalName}</span>}</Td>
                <Td className="text-muted-foreground text-xs">{s.lotName ?? '—'}</Td>
                <Td className="text-muted-foreground text-xs">{s.notes ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Abortos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader title="Abortos" count={report.abortos.length} color="bg-rose-600" icon={AlertTriangle} />
        <Table>
          <thead>
            <tr><Th>Data</Th><Th>Animal</Th><Th>Lote</Th><Th>Observações</Th></tr>
          </thead>
          <tbody>
            {report.abortos.length === 0 ? <EmptyRow /> : report.abortos.map(a => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDate(a.occurredAt)}</Td>
                <Td><span className="font-mono font-semibold text-primary">{a.animalTag}</span>{a.animalName && <span className="text-muted-foreground ml-1.5 text-xs">· {a.animalName}</span>}</Td>
                <Td className="text-muted-foreground text-xs">{a.lotName ?? '—'}</Td>
                <Td className="text-muted-foreground text-xs">{a.notes ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Reprodução */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader title="Reprodução" count={report.reproducao.length} color="bg-pink-500" icon={Heart} />
        <Table>
          <thead>
            <tr><Th>Data</Th><Th>Animal</Th><Th>Tipo</Th><Th>Status</Th><Th>Touro / Sêmen</Th><Th>Resultado</Th></tr>
          </thead>
          <tbody>
            {report.reproducao.length === 0 ? <EmptyRow /> : report.reproducao.map(r => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDate(r.date)}</Td>
                <Td><span className="font-mono font-semibold text-primary">{r.animalTag}</span>{r.animalName && <span className="text-muted-foreground ml-1.5 text-xs">· {r.animalName}</span>}</Td>
                <Td className="text-xs">{REPRO_TYPE_LABELS[r.type] ?? r.type}</Td>
                <Td><span className={cn('text-xs font-medium', r.status === 'CONFIRMED' && 'text-emerald-600 dark:text-emerald-400', r.status === 'FAILED' && 'text-red-500')}>{REPRO_STATUS_LABELS[r.status] ?? r.status}</span></Td>
                <Td className="text-xs text-muted-foreground">{r.bullName ?? '—'}</Td>
                <Td className="text-xs text-muted-foreground">{r.result ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Eventos de Saúde */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader title="Eventos de Saúde" count={report.saude.length} color="bg-red-500" icon={Stethoscope} />
        <Table>
          <thead>
            <tr><Th>Data</Th><Th>Animal</Th><Th>Tipo</Th><Th>Descrição</Th><Th>Medicação</Th><Th>Situação</Th></tr>
          </thead>
          <tbody>
            {report.saude.length === 0 ? <EmptyRow /> : report.saude.map(e => (
              <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDate(e.occurredAt)}</Td>
                <Td><span className="font-mono font-semibold text-primary">{e.animalTag}</span>{e.animalName && <span className="text-muted-foreground ml-1.5 text-xs">· {e.animalName}</span>}</Td>
                <Td className="text-xs">{HEALTH_LABELS[e.type] ?? e.type}</Td>
                <Td className="text-xs">{e.description}</Td>
                <Td className="text-xs text-muted-foreground">{e.medication ?? '—'}</Td>
                <Td><span className={cn('text-xs font-medium', e.resolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>{e.resolved ? 'Resolvido' : 'Em tratamento'}</span></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Alertas */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader title="Alertas do Período" count={report.alertas.length} color="bg-orange-500" icon={Bell} />
        <Table>
          <thead>
            <tr><Th>Data</Th><Th>Animal</Th><Th>Tipo</Th><Th>Prioridade</Th><Th>Status</Th><Th>Resolvido em</Th></tr>
          </thead>
          <tbody>
            {report.alertas.length === 0 ? <EmptyRow /> : report.alertas.map(a => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDate(a.createdAt)}</Td>
                <Td>{a.animalTag ? <><span className="font-mono font-semibold text-primary">{a.animalTag}</span>{a.animalName && <span className="text-muted-foreground ml-1.5 text-xs">· {a.animalName}</span>}</> : <span className="text-muted-foreground text-xs">—</span>}</Td>
                <Td className="text-xs">{ALERT_TYPE_LABELS[a.type] ?? a.type}</Td>
                <Td><span className={cn('text-xs font-semibold', a.priority === 'HIGH' ? 'text-red-500' : a.priority === 'MEDIUM' ? 'text-amber-500' : 'text-zinc-400')}>{ALERT_PRIORITY_LABELS[a.priority] ?? a.priority}</span></Td>
                <Td><span className={cn('text-xs font-medium', a.status === 'RESOLVED' ? 'text-emerald-600 dark:text-emerald-400' : a.status === 'DISMISSED' ? 'text-zinc-400' : 'text-amber-600 dark:text-amber-400')}>{a.status === 'RESOLVED' ? 'Resolvido' : a.status === 'DISMISSED' ? 'Ignorado' : 'Pendente'}</span></Td>
                <Td className="text-xs text-muted-foreground">{a.resolvedAt ? fmtDate(a.resolvedAt) : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )
}
