import { auth }            from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/prisma'
import { canAccess }       from '@/lib/permissions'
import { getFarmInvites }  from '@/modules/invites/queries'
import { getStorageStatus }    from '@/lib/storage-limits'
import { STORAGE_PROVIDER_NAME } from '@/lib/storage/provider'
import { getActiveFarm }         from '@/lib/active-farm'
import { getOrCreateFarmSettings } from '@/modules/farm-settings/queries'
import { InviteForm }      from '@/modules/invites/components/invite-form'
import { InviteList }      from '@/modules/invites/components/invite-list'
import { FarmSettingsForm } from '@/modules/farm-settings/components/farm-settings-form'
import { getRecentActivity } from '@/modules/audit/queries'
import { AuditLogItemRow }   from '@/modules/audit/components/audit-log-item'
import { PageHeader }      from '@/components/shared/page-header'
import Link                from 'next/link'
import { Building2, User, Users, UserPlus, HardDrive, SlidersHorizontal, ClipboardList } from 'lucide-react'

export const metadata = { title: 'Configurações | BovControl' }

const ROLE_LABELS: Record<string, string> = {
  OWNER:   'Proprietário',
  MANAGER: 'Gerente',
  WORKER:  'Funcionário',
  VIEWER:  'Visualizador',
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const { farmId, role, farm } = activeFarm

  const [isOwner, isManager, members, storageStatus, farmSettings, activeLots] = await Promise.all([
    canAccess(session.user.id, farmId, 'OWNER'),
    canAccess(session.user.id, farmId, 'MANAGER'),
    prisma.farmUser.findMany({
      where:   { farmId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    getStorageStatus(farmId),
    getOrCreateFarmSettings(farmId),
    prisma.lot.findMany({
      where:   { farmId, isActive: true },
      select:  { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const recentActivity = isManager ? await getRecentActivity(farmId, 20) : []

  const actualInvites = isOwner ? await getFarmInvites(farmId) : []

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Configurações"
        description="Gerencie sua fazenda e equipe"
      />

      {/* ── Fazenda ─────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4 text-primary" />
          Fazenda
        </div>
        <dl className="space-y-2">
          <Row label="Nome"     value={farm.name} />
          <Row label="Cidade"   value={farm.city ?? '—'} />
          <Row label="Estado"   value={farm.state} />
          <Row label="ID"       value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{farm.id}</code>} />
        </dl>
      </section>

      {/* ── Parâmetros Gerais ───────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4 text-primary" />
          Parâmetros Gerais
        </div>
        <FarmSettingsForm
          farmId={farmId}
          settings={farmSettings}
          lots={activeLots}
          canEdit={isManager}
        />
      </section>

      {/* ── Armazenamento ───────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HardDrive className="size-4 text-primary" />
            Armazenamento de Fotos
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {STORAGE_PROVIDER_NAME === 'r2' ? 'Cloudflare R2' : 'Local'}
          </span>
        </div>

        {/* Fotos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fotos</span>
            <span className="font-medium tabular-nums">
              {storageStatus.imageCount.toLocaleString('pt-BR')} /{' '}
              {storageStatus.imageLimit.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usageBarColor(storageStatus.imageUsagePct, 'bg-primary')}`}
              style={{ width: `${storageStatus.imageUsagePct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {storageStatus.imageUsagePct.toFixed(1)}% utilizado
          </p>
        </div>

        {/* Espaço em disco */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Espaço</span>
            <span className="font-medium tabular-nums">
              {storageStatus.storageUsedMb < 1024
                ? `${storageStatus.storageUsedMb.toFixed(1)} MB`
                : `${(storageStatus.storageUsedMb / 1024).toFixed(2)} GB`}{' '}
              / {storageStatus.storageLimitMb / 1024} GB
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usageBarColor(storageStatus.storageUsagePct, 'bg-cyan-500')}`}
              style={{ width: `${storageStatus.storageUsagePct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {storageStatus.storageUsagePct.toFixed(1)}% utilizado
          </p>
        </div>

        {!storageStatus.withinLimits ? (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            Limite atingido. Exclua fotos antigas para liberar espaço.
          </p>
        ) : storageUsageMax(storageStatus) >= 95 ? (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            Capacidade quase esgotada ({storageUsageMax(storageStatus).toFixed(0)}%). Exclua fotos antigas em breve.
          </p>
        ) : storageUsageMax(storageStatus) >= 80 ? (
          <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
            Uso elevado ({storageUsageMax(storageStatus).toFixed(0)}%). Considere liberar espaço.
          </p>
        ) : null}
      </section>

      {/* ── Perfil ──────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="size-4 text-primary" />
          Minha conta
        </div>
        <dl className="space-y-2">
          <Row label="Nome"   value={session.user.name ?? '—'} />
          <Row label="E-mail" value={session.user.email ?? '—'} />
          <Row label="Perfil" value={ROLE_LABELS[role] ?? role} />
        </dl>
      </section>

      {/* ── Membros ─────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" />
          Membros da equipe
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {members.length} {members.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>
        <div className="divide-y divide-border/50">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-sm font-medium">
                  {m.user.name?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Atividade Recente (MANAGER+) ───────────────── */}
      {isManager && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-primary" />
              Atividade Recente
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                últimas 20 ações
              </span>
            </div>
            <Link href="/audit" className="text-xs text-primary hover:underline">
              Ver tudo
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma ação registrada ainda.
            </p>
          ) : (
            <div className="divide-y divide-border/40 -mx-4 px-4">
              {recentActivity.map((log) => (
                <AuditLogItemRow key={log.id} log={log} showUser compact />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Convites (OWNER only) ──────────────────────── */}
      {isOwner && (
        <>
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="size-4 text-primary" />
              Convidar membro
            </div>
            <InviteForm farmId={farmId} />
          </section>

          {actualInvites.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                Histórico de convites
              </div>
              <InviteList invites={actualInvites} farmId={farmId} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────

function usageBarColor(pct: number, normalClass: string): string {
  if (pct >= 95) return 'bg-destructive'
  if (pct >= 80) return 'bg-amber-500'
  return normalClass
}

function storageUsageMax(s: { imageUsagePct: number; storageUsagePct: number }): number {
  return Math.max(s.imageUsagePct, s.storageUsagePct)
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-right">{value}</dd>
    </div>
  )
}
