'use client'

import { useState }  from 'react'
import type { ElementType } from 'react'
import Link          from 'next/link'
import Image         from 'next/image'
import { cn }        from '@/lib/utils'
import {
  AlertTriangle, Baby, Droplets, CheckCircle2, ChevronRight,
  Camera, Bell, Heart, Stethoscope, Layers2,
  Edit2,
} from 'lucide-react'
import type { ManagementActionItem, ManagementOverview } from '../types'
import { DryOffSheet }            from './dry-off-sheet'
import { ManagementCalvingSheet } from './management-calving-sheet'
import { ManagementLotSheet }     from './management-lot-sheet'

// ─── Tipo do sheet ativo ──────────────────────────────────

type ActiveSheet =
  | { type: 'DRY_OFF';  item: ManagementActionItem }
  | { type: 'CALVING';  item: ManagementActionItem }
  | { type: 'LOT';      item: ManagementActionItem }
  | null

// ─── Mapa de botões por tipo de ação ─────────────────────

type SheetTriggerType = 'DRY_OFF' | 'CALVING' | 'LOT'

const ACTION_BUTTON: Partial<Record<string, {
  label:      string
  sheetType:  SheetTriggerType
  className:  string
}>> = {
  DRY_OFF_DUE:     { label: 'Secar',    sheetType: 'DRY_OFF', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25' },
  CALVING_OVERDUE: { label: 'Parto',    sheetType: 'CALVING', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/25' },
  CALVING_SOON:    { label: 'Parto',    sheetType: 'CALVING', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/25' },
  MISSING_LOT:     { label: 'Lote',     sheetType: 'LOT',     className: 'bg-primary/10 text-primary hover:bg-primary/20' },
}

// ─── Labels ───────────────────────────────────────────────

const PRIORITY_LABEL = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' } as const
const ORIGIN_LABEL   = {
  VETERINARY_IMPORTED: 'Veterinário',
  MANUAL:              'Manual',
  MIXED:               'Misto',
  UNKNOWN:             'Indefinido',
} as const

// ─── Badges ──────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: ManagementActionItem['priority'] }) {
  return (
    <span className={cn(
      'inline-flex items-center text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0',
      priority === 'HIGH'   && 'bg-red-500/10 text-red-600 dark:text-red-400',
      priority === 'MEDIUM' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      priority === 'LOW'    && 'bg-zinc-500/10 text-zinc-500',
    )}>
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

function OriginBadge({ origin }: { origin: ManagementActionItem['origin'] }) {
  return (
    <span className={cn(
      'inline-flex text-[10px] font-medium rounded-full px-1.5 py-0.5 shrink-0',
      origin === 'VETERINARY_IMPORTED' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      origin === 'MANUAL'              && 'bg-zinc-500/10 text-zinc-500',
      origin === 'MIXED'               && 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      origin === 'UNKNOWN'             && 'bg-muted text-muted-foreground',
    )}>
      {ORIGIN_LABEL[origin]}
    </span>
  )
}

// ─── Thumbnail ────────────────────────────────────────────

function AnimalThumb({ photoUrl, tag }: { photoUrl: string | null; tag: string }) {
  return (
    <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
      {photoUrl ? (
        <Image src={photoUrl} alt={tag} width={40} height={40} className="object-cover w-full h-full" />
      ) : (
        <span className="font-mono text-xs font-bold text-muted-foreground">{tag.slice(-2)}</span>
      )}
    </div>
  )
}

// ─── ActionCard ──────────────────────────────────────────

function ActionCard({
  it,
  onSheet,
}: {
  it:       ManagementActionItem
  onSheet:  (sheet: ActiveSheet) => void
}) {
  const btn = ACTION_BUTTON[it.type]

  // INCOMPLETE_CALF → link direto para edição
  const isIncompleteEdit = it.type === 'INCOMPLETE_CALF'

  return (
    <div className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
      {/* Link principal ocupa o máximo, clica e vai para o animal */}
      <Link
        href={it.href}
        className="flex items-start gap-3 flex-1 min-w-0 hover:bg-muted/30 -mx-3 px-3 rounded-lg transition-colors py-1 -my-1"
      >
        <AnimalThumb photoUrl={it.photoUrl} tag={it.animalTag} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-primary">{it.animalTag}</span>
            {it.animalName && (
              <span className="text-xs text-muted-foreground truncate">{it.animalName}</span>
            )}
            {it.externalCode && (
              <span className="text-[10px] text-muted-foreground/60">{it.externalCode}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <PriorityBadge priority={it.priority} />
            <OriginBadge origin={it.origin} />
            {it.lotName && (
              <span className="text-[10px] text-muted-foreground">· {it.lotName}</span>
            )}
          </div>
          <p className="text-sm font-medium mt-1">{it.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{it.reason}</p>
        </div>
        {!btn && !isIncompleteEdit && (
          <ChevronRight className="size-4 text-muted-foreground shrink-0 self-center" />
        )}
      </Link>

      {/* Botão de ação rápida — abre sheet */}
      {btn && (
        <button
          type="button"
          onClick={() => onSheet({ type: btn.sheetType, item: it })}
          className={cn(
            'shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
            btn.className,
          )}
        >
          {btn.label}
        </button>
      )}

      {/* Bezerros incompletos → link direto para editar */}
      {isIncompleteEdit && (
        <Link
          href={`/animals/${it.animalId}`}
          className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
        >
          <Edit2 className="size-3" />
          Editar
        </Link>
      )}
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────

function Section({
  title, icon: Icon, iconColor, items, emptyMessage, limit = 20, onSheet,
}: {
  title:        string
  icon:         ElementType
  iconColor:    string
  items:        ManagementActionItem[]
  emptyMessage: string
  limit?:       number
  onSheet:      (sheet: ActiveSheet) => void
}) {
  const shown = items.slice(0, limit)
  const rest  = items.length - shown.length

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('size-7 rounded-lg flex items-center justify-center', iconColor)}>
          <Icon className="size-4 text-white" />
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {shown.map((it) => (
            <ActionCard key={it.id} it={it} onSheet={onSheet} />
          ))}
          {rest > 0 && (
            <div className="pt-2 pb-1 text-center">
              <span className="text-xs text-muted-foreground">
                + {rest} item{rest !== 1 ? 'ns' : ''} — acesse /animals para ver todos
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SummaryCard ─────────────────────────────────────────

function SummaryCard({
  label, value, color, href,
}: {
  label: string; value: number; color: string; href?: string
}) {
  const inner = (
    <div className={cn(
      'rounded-xl border border-border bg-card p-3 flex flex-col gap-1',
      href && 'hover:border-primary/30 transition-colors',
    )}>
      <span className={cn('text-2xl font-bold tabular-nums', color)}>{value}</span>
      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

// ─── Componente principal ─────────────────────────────────

export function ManagementTodayClient({ overview }: { overview: ManagementOverview }) {
  const { summary, sections } = overview
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)

  const today     = new Date()
  const dateLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className="space-y-4 pb-8">
        {/* ── Resumo ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <SummaryCard label="Total de ações"      value={summary.totalActions}     color="text-foreground" />
          <SummaryCard label="Alta prioridade"      value={summary.highPriority}     color="text-red-500" />
          <SummaryCard label="Partos próximos"      value={summary.closeToCalving}   color="text-violet-500" />
          <SummaryCard label="A secar"              value={summary.dueToDryOff}      color="text-amber-500" />
          <SummaryCard label="Bezerros incompletos" value={summary.incompleteCalves} color="text-green-500" />
          <SummaryCard label="Alertas pendentes"    value={summary.pendingAlerts}    color="text-orange-500" href="/alerts" />
        </div>

        {summary.totalActions === 0 && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-2">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500" />
            <p className="font-medium text-emerald-600 dark:text-emerald-400">Nenhuma ação pendente para hoje</p>
            <p className="text-xs text-muted-foreground">Todos os cadastros e indicadores veterinários estão em dia.</p>
          </div>
        )}

        {sections.critical.length > 0 && (
          <Section title="Ações Críticas" icon={AlertTriangle} iconColor="bg-red-500"
            items={sections.critical} emptyMessage="Nenhuma ação crítica." onSheet={setActiveSheet} />
        )}

        <Section title="Partos e Amojadas" icon={Baby} iconColor="bg-violet-500"
          items={sections.calving} emptyMessage="Nenhuma vaca com parto próximo." onSheet={setActiveSheet} />

        <Section title="Vacas a Secar" icon={Droplets} iconColor="bg-amber-500"
          items={sections.dryOff} emptyMessage="Nenhuma vaca para secar." onSheet={setActiveSheet} />

        <Section title="Reprodução" icon={Heart} iconColor="bg-pink-500"
          items={sections.reproduction} emptyMessage="Nenhuma ação reprodutiva." onSheet={setActiveSheet} />

        {sections.health.length > 0 && (
          <Section title="Saúde e CCS" icon={Stethoscope} iconColor="bg-rose-500"
            items={sections.health} emptyMessage="Nenhum acompanhamento." onSheet={setActiveSheet} />
        )}

        <Section title="Bezerros e Cadastros Incompletos" icon={Baby} iconColor="bg-green-600"
          items={sections.calves} emptyMessage="Cadastros completos." onSheet={setActiveSheet} />

        {sections.registration.length > 0 && (
          <Section title="Cadastro Incompleto" icon={Layers2} iconColor="bg-zinc-500"
            items={sections.registration} emptyMessage="Todos com foto e lote." limit={15} onSheet={setActiveSheet} />
        )}

        <Section title="Alertas Pendentes" icon={Bell} iconColor="bg-orange-500"
          items={sections.alerts} emptyMessage="Nenhum alerta." onSheet={setActiveSheet} />

        {summary.pendingAlerts > 0 && (
          <div className="text-center">
            <Link href="/alerts" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Bell className="size-3.5" />
              Ver todos os alertas
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ── Sheets ───────────────────────────────────────── */}
      <DryOffSheet
        open={activeSheet?.type === 'DRY_OFF'}
        onClose={() => setActiveSheet(null)}
        animalId={activeSheet?.type === 'DRY_OFF'   ? activeSheet.item.animalId   : ''}
        animalTag={activeSheet?.type === 'DRY_OFF'  ? activeSheet.item.animalTag  : ''}
        animalName={activeSheet?.type === 'DRY_OFF' ? activeSheet.item.animalName : null}
      />
      <ManagementCalvingSheet
        open={activeSheet?.type === 'CALVING'}
        onClose={() => setActiveSheet(null)}
        animalId={activeSheet?.type === 'CALVING'   ? activeSheet.item.animalId   : ''}
        animalTag={activeSheet?.type === 'CALVING'  ? activeSheet.item.animalTag  : ''}
        animalName={activeSheet?.type === 'CALVING' ? activeSheet.item.animalName : null}
      />
      <ManagementLotSheet
        open={activeSheet?.type === 'LOT'}
        onClose={() => setActiveSheet(null)}
        animalId={activeSheet?.type === 'LOT'   ? activeSheet.item.animalId   : ''}
        animalTag={activeSheet?.type === 'LOT'  ? activeSheet.item.animalTag  : ''}
        animalName={activeSheet?.type === 'LOT' ? activeSheet.item.animalName : null}
      />
    </>
  )
}
