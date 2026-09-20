import { prisma } from '@/lib/prisma'

export interface TEAnimalEntry {
  reproductionId: string
  animalId: string
  tag: string
  name: string | null
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  result: string | null
  donor: string
  ovaQuality: string
  sexo: string
  dgP30: string
  dgP60: string
  prevParto: string
  teDate: string
  opuDate: string
}

export interface TEProtocolSummary {
  animals: TEAnimalEntry[]
  laboratorio: string
  touro: string
  teDate: string
  opuDate: string
  dgP30: string
  dgP60: string
  prevParto: string
}

export async function getTEProtocol(farmId: string): Promise<TEProtocolSummary | null> {
  const records = await prisma.reproduction.findMany({
    where: {
      type:     'INSEMINATION',
      bullName: { startsWith: 'TE:' },
      animal:   { farmId, status: 'ACTIVE' },
    },
    select: {
      id:        true,
      status:    true,
      result:    true,
      notes:     true,
      animal: {
        select: { id: true, tag: true, name: true },
      },
    },
    orderBy: { animal: { tag: 'asc' } },
  })

  if (records.length === 0) return null

  // Parse the first record's notes for protocol-level info
  let meta: Record<string, string> = {}
  try {
    meta = JSON.parse(records[0]!.notes ?? '{}')
  } catch {}

  const animals: TEAnimalEntry[] = records.map((r) => {
    let rMeta: Record<string, string> = {}
    try { rMeta = JSON.parse(r.notes ?? '{}') } catch {}
    return {
      reproductionId: r.id,
      animalId:       r.animal.id,
      tag:            r.animal.tag,
      name:           r.animal.name,
      status:         r.status as 'PENDING' | 'CONFIRMED' | 'FAILED',
      result:         r.result,
      donor:          rMeta.doadora   ?? '',
      ovaQuality:     rMeta.ovaQuality ?? '',
      sexo:           rMeta.sexo       ?? '',
      dgP30:          rMeta.dgP30      ?? '',
      dgP60:          rMeta.dgP60      ?? '',
      prevParto:      rMeta.prevParto  ?? '',
      teDate:         rMeta.teDate     ?? '',
      opuDate:        rMeta.opuDate    ?? '',
    }
  })

  return {
    animals,
    laboratorio: meta.laboratorio ?? '',
    touro:       meta.touro       ?? '',
    teDate:      meta.teDate      ?? '',
    opuDate:     meta.opuDate     ?? '',
    dgP30:       meta.dgP30       ?? '',
    dgP60:       meta.dgP60       ?? '',
    prevParto:   meta.prevParto   ?? '',
  }
}
