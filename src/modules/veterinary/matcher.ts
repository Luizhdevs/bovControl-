import { prisma }              from '@/lib/prisma'
import type { ParsedVeterinaryRow } from './csv-parser'
import type { VeterinaryMatchStatus, VeterinaryMatchCandidate } from './types'

export type { VeterinaryMatchStatus, VeterinaryMatchCandidate }

export interface VeterinaryMatchResult {
  row:         ParsedVeterinaryRow
  animalId:    string | null   // set only for strong matches
  matchStatus: VeterinaryMatchStatus
  candidates:  VeterinaryMatchCandidate[]
}

type AnimalRecord = { id: string; tag: string; name: string | null; externalCode: string | null }

function normalizeAnimalName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function addToMap(map: Map<string, AnimalRecord[]>, key: string, animal: AnimalRecord): void {
  const existing = map.get(key)
  if (existing) existing.push(animal)
  else map.set(key, [animal])
}

// ─── Main match function ──────────────────────────────────

export async function matchVeterinaryRowsToAnimals(
  farmId: string,
  rows:   ParsedVeterinaryRow[],
): Promise<VeterinaryMatchResult[]> {
  if (rows.length === 0) return []

  const animals = await prisma.animal.findMany({
    where:  { farmId },
    select: { id: true, tag: true, name: true, externalCode: true },
  })

  const byExternalCode = new Map<string, AnimalRecord[]>()
  const byTag          = new Map<string, AnimalRecord[]>()
  const byName         = new Map<string, AnimalRecord[]>()
  const byNormName     = new Map<string, AnimalRecord[]>()

  for (const a of animals) {
    if (a.externalCode) {
      addToMap(byExternalCode, a.externalCode.trim().toLowerCase(), a)
    }
    addToMap(byTag, a.tag.trim().toLowerCase(), a)

    if (a.name) {
      addToMap(byName, a.name.trim().toLowerCase(), a)
      const normKey = normalizeAnimalName(a.name)
      if (normKey) addToMap(byNormName, normKey, a)
    }
  }

  function toCandidate(a: AnimalRecord, reason: VeterinaryMatchStatus): VeterinaryMatchCandidate {
    return { animalId: a.id, tag: a.tag, name: a.name, reason }
  }

  function matchSingle(
    hits: AnimalRecord[] | undefined,
    reason: VeterinaryMatchStatus,
    isStrong: boolean,
  ): VeterinaryMatchResult | null {
    if (!hits || hits.length === 0) return null

    if (hits.length === 1) {
      const first = hits[0]
      if (!first) return null
      return isStrong
        ? { row: null as unknown as ParsedVeterinaryRow, animalId: first.id, matchStatus: reason, candidates: [] }
        : { row: null as unknown as ParsedVeterinaryRow, animalId: null,     matchStatus: reason, candidates: [toCandidate(first, reason)] }
    }

    // Multiple hits → duplicate candidates
    return {
      row:         null as unknown as ParsedVeterinaryRow,
      animalId:    null,
      matchStatus: 'DUPLICATE_CANDIDATES',
      candidates:  hits.map((a) => toCandidate(a, reason)),
    }
  }

  return rows.map((row): VeterinaryMatchResult => {
    try {
      const code     = row.externalCode?.trim().toLowerCase()
      const name     = row.animalName?.trim().toLowerCase()
      const normName = normalizeAnimalName(row.animalName)

      // 1. Exact external code → animal.externalCode (STRONG)
      if (code) {
        const r = matchSingle(byExternalCode.get(code), 'EXACT_EXTERNAL_CODE', true)
        if (r) return { ...r, row }
      }

      // 2. External code → animal.tag (STRONG)
      if (code) {
        const r = matchSingle(byTag.get(code), 'EXACT_TAG', true)
        if (r) return { ...r, row }
      }

      // 3. Exact name (WEAK — requires review)
      if (name) {
        const r = matchSingle(byName.get(name), 'EXACT_NAME', false)
        if (r) return { ...r, row }
      }

      // 4. Normalized name (WEAK — requires review)
      if (normName) {
        const hits = byNormName.get(normName)
        if (hits && hits.length > 0) {
          const unique = [...new Map(hits.map((a) => [a.id, a])).values()]
          const r = matchSingle(unique, 'NORMALIZED_NAME', false)
          if (r) return { ...r, row }
        }
      }

      return { row, animalId: null, matchStatus: 'UNMATCHED', candidates: [] }
    } catch {
      return { row, animalId: null, matchStatus: 'ERROR', candidates: [] }
    }
  })
}
