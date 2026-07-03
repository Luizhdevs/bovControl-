import { auth }                        from '@/lib/auth'
import { redirect }                    from 'next/navigation'
import { getActiveFarm }               from '@/lib/active-farm'
import { canAccess }                   from '@/lib/permissions'
import { getVeterinaryImportReview }   from '@/modules/veterinary/queries'
import { PageHeader }                  from '@/components/shared/page-header'
import { VETERINARY_GROUP_LABELS, REPORT_SOURCE_LABELS, REPORT_STATUS_LABELS } from '@/modules/veterinary/constants'
import { DAY_MEANING_LABELS }          from '@/modules/veterinary/constants'
import { format }                      from 'date-fns'
import { ptBR }                        from 'date-fns/locale'
import {
  CheckCircle2, AlertCircle, HelpCircle, XCircle,
  Lock, User,
} from 'lucide-react'
import type { VeterinaryAnimalSnapshot } from '@prisma/client'
import type {
  VeterinarySnapshotWithAnimal,
  VeterinarySnapshotRaw,
  VeterinaryMatchCandidate,
} from '@/modules/veterinary/types'

export const metadata = { title: 'Revisão da Importação | BovControl' }

// ─── Helpers ──────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) } catch { return '—' }
}

function getSnapshotRaw(snap: VeterinaryAnimalSnapshot): VeterinarySnapshotRaw | null {
  return snap.rawRow as VeterinarySnapshotRaw | null
}

function getMatchStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'EXACT_EXTERNAL_CODE': return 'Código externo'
    case 'EXACT_TAG':           return 'Brinco'
    case 'EXACT_NAME':          return 'Nome exato'
    case 'NORMALIZED_NAME':     return 'Nome normalizado'
    case 'DUPLICATE_CANDIDATES':return 'Duplicados'
    case 'UNMATCHED':           return 'Não encontrado'
    case 'ERROR':               return 'Erro de leitura'
    default:                    return 'Desconhecido'
  }
}

// ─── Stat card ────────────────────────────────────────────

function StatCard({
  label, value, color = 'default',
}: { label: string; value: number | string; color?: 'green' | 'amber' | 'red' | 'default' }) {
  const colors = {
    green:   'border-green-500/30 bg-green-500/5  text-green-600 dark:text-green-400',
    amber:   'border-amber-500/30 bg-amber-500/5  text-amber-600 dark:text-amber-400',
    red:     'border-red-500/30   bg-red-500/5    text-red-600   dark:text-red-400',
    default: 'border-border       bg-card         text-foreground',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────

function SectionHeader({ title, count, icon: Icon, color }: {
  title: string; count: number;
  icon:  React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`size-4 ${color}`} />
      <h2 className="text-sm font-semibold">{title}</h2>
      <span className="ml-auto text-xs text-muted-foreground">{count} registro{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

// ─── Row: auto-matched ────────────────────────────────────

function AutoMatchedRow({ snap }: { snap: VeterinarySnapshotWithAnimal }) {
  const raw    = getSnapshotRaw(snap)
  const status = raw?.matchStatus
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{snap.externalCode ?? '—'}</td>
      <td className="py-2 px-3 text-sm font-medium">{snap.animalName ?? '—'}</td>
      <td className="py-2 px-3 text-xs">{VETERINARY_GROUP_LABELS[snap.reportGroup]}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{fmtDate(snap.lastCalvingDate)}</td>
      <td className="py-2 px-3 text-xs">
        {snap.animal ? (
          <span className="font-mono text-primary">{snap.animal.tag}</span>
        ) : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{snap.animal?.name ?? '—'}</td>
      <td className="py-2 px-3">
        <span className="inline-flex items-center gap-1 text-xs rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 font-medium">
          <CheckCircle2 className="size-3" />
          {getMatchStatusLabel(status)}
        </span>
      </td>
    </tr>
  )
}

// ─── Row: pending review ──────────────────────────────────

function PendingReviewRow({ snap }: { snap: VeterinarySnapshotWithAnimal }) {
  const raw        = getSnapshotRaw(snap)
  const status     = raw?.matchStatus
  const candidates = raw?.candidates as VeterinaryMatchCandidate[] | undefined
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{snap.externalCode ?? '—'}</td>
      <td className="py-2 px-3 text-sm font-medium">{snap.animalName ?? '—'}</td>
      <td className="py-2 px-3 text-xs">{VETERINARY_GROUP_LABELS[snap.reportGroup]}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{fmtDate(snap.lastCalvingDate)}</td>
      <td className="py-2 px-3 text-xs" colSpan={2}>
        {candidates && candidates.length > 0 ? (
          <div className="space-y-0.5">
            {candidates.slice(0, 3).map((c) => (
              <div key={c.animalId} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <User className="size-3" />
                <span className="font-mono">{c.tag}</span>
                {c.name && <span className="text-muted-foreground">— {c.name}</span>}
              </div>
            ))}
            {candidates.length > 3 && (
              <p className="text-xs text-muted-foreground">+{candidates.length - 3} outros</p>
            )}
          </div>
        ) : '—'}
      </td>
      <td className="py-2 px-3">
        <span className="inline-flex items-center gap-1 text-xs rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-medium">
          <AlertCircle className="size-3" />
          {getMatchStatusLabel(status)}
        </span>
      </td>
    </tr>
  )
}

// ─── Row: unmatched ───────────────────────────────────────

function UnmatchedRow({ snap }: { snap: VeterinaryAnimalSnapshot }) {
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{snap.externalCode ?? '—'}</td>
      <td className="py-2 px-3 text-sm font-medium">{snap.animalName ?? '—'}</td>
      <td className="py-2 px-3 text-xs">{VETERINARY_GROUP_LABELS[snap.reportGroup]}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{fmtDate(snap.lastCalvingDate)}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground" colSpan={3}>
        Nenhum animal encontrado com este código/nome
      </td>
    </tr>
  )
}

// ─── Row: parse error ─────────────────────────────────────

function ErrorRow({ snap, index }: { snap: VeterinaryAnimalSnapshot; index: number }) {
  const raw = getSnapshotRaw(snap)
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3 text-xs text-muted-foreground">Linha {index + 2}</td>
      <td className="py-2 px-3 text-xs text-red-600 dark:text-red-400" colSpan={6}>
        {raw?.parseError ?? 'Erro ao processar linha'}
      </td>
    </tr>
  )
}

// ─── Table wrapper ────────────────────────────────────────

function SnapshotTable({ children, minimal }: { children: React.ReactNode; minimal?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left">
        <thead className="bg-muted/50">
          <tr>
            {minimal ? (
              <>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Linha</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground" colSpan={6}>Motivo do erro</th>
              </>
            ) : (
              <>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Código</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Nome</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Grupo</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Último parto</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Brinco</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Animal</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>
}

export default async function VeterinaryImportReviewPage({ params }: Props) {
  const { id } = await params

  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const allowed = await canAccess(session.user.id, activeFarm.farmId, 'MANAGER')
  if (!allowed) redirect('/')

  const review = await getVeterinaryImportReview(id, activeFarm.farmId)
  if (!review) redirect('/veterinary/import')

  const { report, autoMatched, pendingReview, unmatched, parseErrors } = review

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Revisão do Relatório"
        description={`${REPORT_SOURCE_LABELS[report.sourceSystem]} · ${fmtDate(report.reportDate)}`}
        backHref="/veterinary/import"
      />

      {/* Aviso informativo */}
      <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <p>
          Esta etapa <strong>não alterou os animais</strong>. O relatório está como rascunho.
          Revise os vínculos abaixo antes de confirmar a importação.
        </p>
      </div>

      {/* Metadados do relatório */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          <div><span className="font-medium text-foreground">Técnico:</span> {report.technicianName ?? '—'}</div>
          <div><span className="font-medium text-foreground">Fazenda:</span> {report.externalFarmName ?? '—'}</div>
          <div><span className="font-medium text-foreground">Proprietário:</span> {report.externalOwnerName ?? '—'}</div>
          <div><span className="font-medium text-foreground">Arquivo:</span> {report.originalFilename ?? '—'}</div>
          <div><span className="font-medium text-foreground">Status:</span> {REPORT_STATUS_LABELS[report.importStatus]}</div>
          <div><span className="font-medium text-foreground">Fonte:</span> {REPORT_SOURCE_LABELS[report.sourceSystem]}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total de linhas"          value={report.totalRows}     />
        <StatCard label="Vinculados automaticamente" value={report.matchedRows}   color="green" />
        <StatCard label="Sem vínculo"              value={report.unmatchedRows}  color={report.unmatchedRows > 0 ? 'amber' : 'default'} />
        <StatCard label="Erros de leitura"         value={parseErrors.length}    color={parseErrors.length > 0 ? 'red' : 'default'} />
      </div>

      {/* ── Seção 1: Vinculados automaticamente ──────────── */}
      {autoMatched.length > 0 && (
        <section className="space-y-2">
          <SectionHeader
            title="Vinculados automaticamente"
            count={autoMatched.length}
            icon={CheckCircle2}
            color="text-green-500"
          />
          <SnapshotTable>
            {autoMatched.map((snap) => (
              <AutoMatchedRow key={snap.id} snap={snap} />
            ))}
          </SnapshotTable>
        </section>
      )}

      {/* ── Seção 2: Revisão necessária ───────────────────── */}
      {pendingReview.length > 0 && (
        <section className="space-y-2">
          <SectionHeader
            title="Revisão necessária — candidatos encontrados"
            count={pendingReview.length}
            icon={AlertCircle}
            color="text-amber-500"
          />
          <p className="text-xs text-muted-foreground">
            Estes animais foram encontrados por correspondência de nome (match fraco).
            Confirme manualmente na Sprint 9.1E.
          </p>
          <SnapshotTable>
            {pendingReview.map((snap) => (
              <PendingReviewRow key={snap.id} snap={snap} />
            ))}
          </SnapshotTable>
        </section>
      )}

      {/* ── Seção 3: Não encontrados ──────────────────────── */}
      {unmatched.length > 0 && (
        <section className="space-y-2">
          <SectionHeader
            title="Não encontrados no cadastro"
            count={unmatched.length}
            icon={HelpCircle}
            color="text-zinc-500"
          />
          <p className="text-xs text-muted-foreground">
            Nenhum animal com este código ou nome foi encontrado na fazenda.
            Vincule manualmente ou verifique o cadastro.
          </p>
          <SnapshotTable>
            {unmatched.map((snap) => (
              <UnmatchedRow key={snap.id} snap={snap} />
            ))}
          </SnapshotTable>
        </section>
      )}

      {/* ── Seção 4: Erros de leitura do CSV ─────────────── */}
      {parseErrors.length > 0 && (
        <section className="space-y-2">
          <SectionHeader
            title="Linhas com erro de leitura"
            count={parseErrors.length}
            icon={XCircle}
            color="text-red-500"
          />
          <p className="text-xs text-muted-foreground">
            Estas linhas foram ignoradas porque não foi possível identificar código ou nome do animal.
          </p>
          <SnapshotTable minimal>
            {parseErrors.map((snap, i) => (
              <ErrorRow key={snap.id} snap={snap} index={i} />
            ))}
          </SnapshotTable>
        </section>
      )}

      {/* ── Estado vazio total ────────────────────────────── */}
      {autoMatched.length === 0 && pendingReview.length === 0 &&
        unmatched.length === 0 && parseErrors.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum snapshot encontrado neste relatório.
        </div>
      )}

      {/* ── Botão confirmar (desabilitado — Sprint 9.1C) ─── */}
      <div className="pt-4 border-t border-border space-y-2">
        <button
          disabled
          className="w-full sm:w-auto flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed"
        >
          <Lock className="size-4" />
          Confirmar importação — disponível na Sprint 9.1C
        </button>
        <p className="text-xs text-muted-foreground">
          A confirmação criará os registros de reprodução, alertas e atualizará os dados
          dos animais vinculados. Disponível após revisão completa dos vínculos.
        </p>
      </div>
    </div>
  )
}
