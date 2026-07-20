'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, Play } from 'lucide-react'
import { SectionCard } from '@/components/shared/section-card'
import { DryOffSheet } from '@/modules/management/components/dry-off-sheet'
import type { NextAction } from '../helpers'

// ─── Props ─────────────────────────────────────────────────

interface AnimalNextActionsSectionProps {
  actions:    NextAction[]
  animalId:   string
  animalTag:  string
  animalName: string | null
}

// ─── Componente ────────────────────────────────────────────

export function AnimalNextActionsSection({
  actions,
  animalId,
  animalTag,
  animalName,
}: AnimalNextActionsSectionProps) {
  const [dryOffOpen, setDryOffOpen] = useState(false)

  return (
    <>
      <SectionCard
        title="Próximas Ações"
        subtitle={
          actions.length > 0
            ? `${actions.length} item${actions.length !== 1 ? 'ns' : ''} pendente${actions.length !== 1 ? 's' : ''}`
            : undefined
        }
      >
        {actions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Nenhuma ação pendente para este animal</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actions.map((action, i) => (
              <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                <span className={cn(
                  'shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5',
                  action.priority === 'HIGH'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : action.priority === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-zinc-500/10 text-zinc-500',
                )}>
                  {action.priority === 'HIGH' ? 'Alta' : action.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                </span>

                <div className="flex-1 min-w-0">
                  {action.link ? (
                    <Link href={action.link} className="text-sm font-medium text-primary hover:underline">
                      {action.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{action.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                </div>

                {/* Botão de ação inline para tipos com formulário */}
                {action.type === 'DRY_OFF' && (
                  <button
                    type="button"
                    onClick={() => setDryOffOpen(true)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                      'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                      'hover:bg-amber-500/25 transition-colors',
                    )}
                  >
                    <Play className="size-3 fill-current" />
                    Registrar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <DryOffSheet
        open={dryOffOpen}
        onClose={() => setDryOffOpen(false)}
        animalId={animalId}
        animalTag={animalTag}
        animalName={animalName}
      />
    </>
  )
}
