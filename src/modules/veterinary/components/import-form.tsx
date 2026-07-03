'use client'

import { useRef, useTransition }         from 'react'
import { useForm, Controller }            from 'react-hook-form'
import { zodResolver }                    from '@hookform/resolvers/zod'
import { useRouter }                      from 'next/navigation'
import { useToast }                       from '@/hooks/use-toast'
import { createVeterinaryReportDraft }    from '../actions'
import {
  createVeterinaryReportDraftSchema,
  type CreateVeterinaryReportDraftInput,
} from '../schemas'
import { REPORT_SOURCE_LABELS }           from '../constants'
import { Button }                         from '@/components/ui/button'
import { Input }                          from '@/components/ui/input'
import { FormField }                      from '@/components/shared/form-field'
import { Upload, AlertCircle }            from 'lucide-react'
import type { VeterinaryReportSource }    from '@prisma/client'

const SOURCE_OPTIONS: { value: VeterinaryReportSource; label: string }[] = [
  { value: 'PRODAP',  label: REPORT_SOURCE_LABELS.PRODAP },
  { value: 'ZIL',     label: REPORT_SOURCE_LABELS.ZIL    },
  { value: 'CSV',     label: REPORT_SOURCE_LABELS.CSV    },
  { value: 'OTHER',   label: REPORT_SOURCE_LABELS.OTHER  },
]

export function VeterinaryImportForm() {
  const router            = useRouter()
  const { toast }         = useToast()
  const [isPending, startTransition] = useTransition()
  const fileRef           = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateVeterinaryReportDraftInput>({
    resolver:      zodResolver(createVeterinaryReportDraftSchema),
    defaultValues: {
      sourceSystem:     'PRODAP',
      originalFilename: '',
      csvContent:       '',
      reportDate:       new Date(),
    },
  })

  const csvContent = watch('csvContent')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setValue('originalFilename', file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result
      if (typeof text === 'string') {
        setValue('csvContent', text, { shouldValidate: true })
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const onSubmit = (data: CreateVeterinaryReportDraftInput) => {
    startTransition(async () => {
      const result = await createVeterinaryReportDraft(data)

      if (!result.success) {
        toast({ title: 'Erro ao importar', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title:       'Relatório criado',
        description: 'Rascunho criado. Revise os vínculos abaixo.',
      })
      router.push(`/veterinary/import/${result.data.reportId}/review`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Aviso informativo */}
      <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <p>
          Esta etapa <strong>não altera os animais</strong>. Ela apenas importa o relatório
          como rascunho para revisão e vinculação.
        </p>
      </div>

      {/* Data + Fonte */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Data do relatório" required error={errors.reportDate?.message}>
          <Input
            type="date"
            {...register('reportDate', { valueAsDate: true })}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField label="Sistema de origem" required error={errors.sourceSystem?.message}>
          <Controller
            control={control}
            name="sourceSystem"
            render={({ field }) => (
              <select
                {...field}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          />
        </FormField>
      </div>

      {/* Técnico + Fazenda externa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Técnico / Veterinário" error={errors.technicianName?.message}>
          <Input
            placeholder="Nome do técnico (opcional)"
            {...register('technicianName')}
          />
        </FormField>

        <FormField label="Fazenda no relatório" error={errors.externalFarmName?.message}>
          <Input
            placeholder="Como consta no relatório"
            {...register('externalFarmName')}
          />
        </FormField>
      </div>

      {/* Proprietário */}
      <FormField label="Proprietário no relatório" error={errors.externalOwnerName?.message}>
        <Input
          placeholder="Nome do proprietário (opcional)"
          {...register('externalOwnerName')}
        />
      </FormField>

      {/* Upload */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Arquivo CSV
          <span className="text-destructive ml-1" aria-label="obrigatório">*</span>
        </p>
        <p className="text-xs text-muted-foreground">
          O CSV precisa conter a coluna <strong>Grupo</strong> para identificar a seção do
          relatório. Separadores aceitos: vírgula, ponto-e-vírgula ou tab. Máximo 2 MB.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex gap-2">
          <Input
            placeholder="nome-do-arquivo.csv"
            {...register('originalFilename')}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="shrink-0 gap-1.5"
          >
            <Upload className="size-4" />
            Carregar arquivo
          </Button>
        </div>

        {/* Controlled textarea via Controller to avoid double-ref conflict */}
        <Controller
          control={control}
          name="csvContent"
          render={({ field }) => (
            <textarea
              {...field}
              rows={10}
              placeholder={
                'Cole o CSV aqui ou use o botão "Carregar arquivo"\n\n' +
                'Código,Nome,NP,Último Parto,RP,Sx,Inseminação,Nº,Dias,Reprodutor,Dt Parto Provável,Pico/Sc,Prod/Sc,Raça,Pai,C,T,Ocorrência,Descarte,Dias de mamite,CCS x 1000,Grupo'
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[160px]"
            />
          )}
        />

        {errors.csvContent && (
          <p className="text-xs text-destructive font-medium" role="alert">
            {errors.csvContent.message}
          </p>
        )}

        {csvContent && (
          <p className="text-xs text-muted-foreground">
            {csvContent.split('\n').filter((l) => l.trim()).length} linhas detectadas
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? 'Processando CSV...' : 'Importar e pré-visualizar'}
      </Button>
    </form>
  )
}
