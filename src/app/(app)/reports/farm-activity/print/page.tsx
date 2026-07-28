import { redirect }       from 'next/navigation'
import { auth }           from '@/lib/auth'
import { getActiveFarm }  from '@/lib/active-farm'
import { getFarmActivityReport } from '@/modules/reports/queries'
import { PrintButton }    from './print-button'

// ─── Labels ───────────────────────────────────────────────

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
  INSEMINATION:    'Inseminação Artificial',
  NATURAL_MATING:  'Monta Natural',
  PREGNANCY_CHECK: 'Diagnóstico de Gestação',
}

const REPRO_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendente',
  CONFIRMED: 'Confirmado',
  FAILED:    'Não confirmado',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  CALVING_OVERDUE:     'Parto vencido',
  CALVING_SOON:        'Parto próximo',
  DRY_OFF_DUE:         'Secar vaca',
  HIGH_CCS:            'CCS elevado',
  MASTITIS_FOLLOW_UP:  'Acompanhamento de mamite',
  DISCARD_REVIEW:      'Revisão de descarte',
  EMPTY_COW_LATE:      'Vaca vazia atrasada',
  PREGNANCY_CHECK_DUE: 'Diag. de gestação pendente',
}

// ─── Helpers ───────────────────────────────────────────────

function fmtDate(d: Date | string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtPeriod(from: Date, to: Date): string {
  return `${fmtDate(from)} a ${fmtDate(to)}`
}

// ─── Componentes de tabela ─────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign:     'left',
      fontSize:      '10px',
      fontWeight:    700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color:         '#6b7280',
      padding:       '6px 8px',
      borderBottom:  '1px solid #e5e7eb',
      whiteSpace:    'nowrap',
    }}>{children}</th>
  )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{
      padding:      '6px 8px',
      fontSize:     '12px',
      borderBottom: '1px solid #f3f4f6',
      verticalAlign:'top',
      fontFamily:   mono ? 'monospace' : undefined,
      fontWeight:   mono ? 600 : undefined,
    }}>{children ?? '—'}</td>
  )
}

function Section({ title, children, count }: {
  title:    string
  count:    number
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '8px',
        borderBottom:   '2px solid #111827',
        paddingBottom:  '4px',
      }}>
        <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>{count} registro{count !== 1 ? 's' : ''}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyNote() {
  return (
    <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', padding: '8px 0', margin: 0 }}>
      Nenhum registro neste período.
    </p>
  )
}

function ReportTable({ children }: { children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      {children}
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default async function PrintReportPage({
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

  const fromStr  = sp.from ?? `${year}-${String(month).padStart(2, '0')}-01`
  const monthNum = parseInt(fromStr.slice(5, 7))
  const yearNum  = parseInt(fromStr.slice(0, 4))
  const lastDay  = new Date(yearNum, monthNum, 0).getDate()
  const toStr    = sp.to ?? `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const from = new Date(fromStr + 'T00:00:00')
  const to   = new Date(toStr   + 'T23:59:59')

  const report = await getFarmActivityReport(activeFarm.farmId, from, to)

  const printedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      {/* Esconde sidebar/header/nav ao imprimir */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page { margin: 15mm; size: A4 portrait; }
        @media print {
          header, aside, nav, footer, .no-print { display: none !important; }
          main { padding: 0 !important; }
          main > div { padding: 0 !important; max-width: 100% !important; }
        }
        @media screen {
          .print-content { max-width: 900px; margin: 0 auto; }
        }
      `}} />

      <div className="print-content" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111827', background: 'white', padding: '8px 0' }}>

        {/* Barra de ações — some ao imprimir */}
        <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <PrintButton />
          <a href="/reports/farm-activity" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>
            ← Voltar
          </a>
        </div>

        {/* Cabeçalho do relatório */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   '24px',
          paddingBottom:  '16px',
          borderBottom:   '3px solid #111827',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>🐄 BovControl</div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>Relatório de Movimentação da Fazenda</div>
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '2px' }}>{report.farmName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Período</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8' }}>{fmtPeriod(from, to)}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>Emitido em {printedAt}</div>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '28px' }}>
          {[
            { label: 'Partos',      value: report.partos.length     },
            { label: 'Secagens',    value: report.secagens.length   },
            { label: 'Abortos',     value: report.abortos.length    },
            { label: 'Ev. Saúde',   value: report.saude.length      },
            { label: 'Reprodução',  value: report.reproducao.length },
            { label: 'Alertas',     value: report.alertas.length    },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 4px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Partos */}
        <Section title="Partos (Nascimentos)" count={report.partos.length}>
          {report.partos.length === 0 ? <EmptyNote /> : (
            <ReportTable>
              <thead><tr><Th>Data</Th><Th>Mãe</Th><Th>Nome da Mãe</Th><Th>Lote</Th><Th>Brinco Bezerro</Th><Th>Nome Bezerro</Th><Th>Sexo</Th></tr></thead>
              <tbody>
                {report.partos.map(p => (
                  <tr key={p.id}>
                    <Td mono>{fmtDate(p.date)}</Td>
                    <Td mono>{p.motherTag}</Td>
                    <Td>{p.motherName ?? '—'}</Td>
                    <Td>{p.lotName ?? '—'}</Td>
                    <Td mono>{p.calveTag ?? '—'}</Td>
                    <Td>{p.calveName ?? '—'}</Td>
                    <Td>{p.calveSex === 'FEMALE' ? 'Fêmea ♀' : p.calveSex === 'MALE' ? 'Macho ♂' : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          )}
        </Section>

        {/* Secagens */}
        <Section title="Secagens" count={report.secagens.length}>
          {report.secagens.length === 0 ? <EmptyNote /> : (
            <ReportTable>
              <thead><tr><Th>Data</Th><Th>Brinco</Th><Th>Nome</Th><Th>Lote</Th><Th>Observações</Th></tr></thead>
              <tbody>
                {report.secagens.map(s => (
                  <tr key={s.id}>
                    <Td mono>{fmtDate(s.occurredAt)}</Td>
                    <Td mono>{s.animalTag}</Td>
                    <Td>{s.animalName ?? '—'}</Td>
                    <Td>{s.lotName ?? '—'}</Td>
                    <Td>{s.notes ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          )}
        </Section>

        {/* Abortos */}
        <Section title="Abortos" count={report.abortos.length}>
          {report.abortos.length === 0 ? <EmptyNote /> : (
            <ReportTable>
              <thead><tr><Th>Data</Th><Th>Brinco</Th><Th>Nome</Th><Th>Lote</Th><Th>Observações</Th></tr></thead>
              <tbody>
                {report.abortos.map(a => (
                  <tr key={a.id}>
                    <Td mono>{fmtDate(a.occurredAt)}</Td>
                    <Td mono>{a.animalTag}</Td>
                    <Td>{a.animalName ?? '—'}</Td>
                    <Td>{a.lotName ?? '—'}</Td>
                    <Td>{a.notes ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          )}
        </Section>

        {/* Reprodução */}
        <Section title="Reprodução (Inseminações e Diagnósticos)" count={report.reproducao.length}>
          {report.reproducao.length === 0 ? <EmptyNote /> : (
            <ReportTable>
              <thead><tr><Th>Data</Th><Th>Brinco</Th><Th>Nome</Th><Th>Tipo</Th><Th>Status</Th><Th>Touro / Sêmen</Th><Th>Resultado</Th></tr></thead>
              <tbody>
                {report.reproducao.map(r => (
                  <tr key={r.id}>
                    <Td mono>{fmtDate(r.date)}</Td>
                    <Td mono>{r.animalTag}</Td>
                    <Td>{r.animalName ?? '—'}</Td>
                    <Td>{REPRO_TYPE_LABELS[r.type] ?? r.type}</Td>
                    <Td>{REPRO_STATUS_LABELS[r.status] ?? r.status}</Td>
                    <Td>{r.bullName ?? '—'}</Td>
                    <Td>{r.result ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          )}
        </Section>

        {/* Saúde */}
        <Section title="Eventos de Saúde" count={report.saude.length}>
          {report.saude.length === 0 ? <EmptyNote /> : (
            <ReportTable>
              <thead><tr><Th>Data</Th><Th>Brinco</Th><Th>Nome</Th><Th>Tipo</Th><Th>Descrição</Th><Th>Medicação</Th><Th>Custo</Th><Th>Situação</Th></tr></thead>
              <tbody>
                {report.saude.map(e => (
                  <tr key={e.id}>
                    <Td mono>{fmtDate(e.occurredAt)}</Td>
                    <Td mono>{e.animalTag}</Td>
                    <Td>{e.animalName ?? '—'}</Td>
                    <Td>{HEALTH_LABELS[e.type] ?? e.type}</Td>
                    <Td>{e.description}</Td>
                    <Td>{e.medication ?? '—'}</Td>
                    <Td>{e.cost != null ? `R$ ${e.cost.toFixed(2)}` : '—'}</Td>
                    <Td>{e.resolved ? 'Resolvido' : 'Em tratamento'}</Td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          )}
        </Section>

        {/* Alertas */}
        <Section title="Alertas do Período" count={report.alertas.length}>
          {report.alertas.length === 0 ? <EmptyNote /> : (
            <ReportTable>
              <thead><tr><Th>Data</Th><Th>Brinco</Th><Th>Tipo</Th><Th>Prioridade</Th><Th>Status</Th><Th>Resolvido em</Th></tr></thead>
              <tbody>
                {report.alertas.map(a => (
                  <tr key={a.id}>
                    <Td mono>{fmtDate(a.createdAt)}</Td>
                    <Td mono>{a.animalTag ?? '—'}</Td>
                    <Td>{ALERT_TYPE_LABELS[a.type] ?? a.type}</Td>
                    <Td>{a.priority === 'HIGH' ? 'Alta' : a.priority === 'MEDIUM' ? 'Média' : 'Baixa'}</Td>
                    <Td>{a.status === 'RESOLVED' ? 'Resolvido' : a.status === 'DISMISSED' ? 'Ignorado' : 'Pendente'}</Td>
                    <Td mono>{a.resolvedAt ? fmtDate(a.resolvedAt) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          )}
        </Section>

        {/* Rodapé */}
        <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
          <span>BovControl · Relatório de Movimentação</span>
          <span>{report.farmName} · {fmtPeriod(from, to)}</span>
        </div>
      </div>
    </>
  )
}
