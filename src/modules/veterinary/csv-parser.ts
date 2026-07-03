import type { VeterinaryReportGroup, VeterinaryDayMeaning } from '@prisma/client'

// ─── Public types ─────────────────────────────────────────

export interface ParsedVeterinaryRow {
  externalCode:          string | null
  animalName:            string | null
  rawGroupLabel:         string | null
  reportGroup:           VeterinaryReportGroup
  parityNumber:          number | null
  lastCalvingDate:       Date | null
  rp:                    string | null
  sx:                    string | null
  inseminationDate:      Date | null
  inseminationNumber:    number | null
  reportDays:            number | null
  dayMeaning:            VeterinaryDayMeaning
  bullName:              string | null
  expectedCalvingDate:   Date | null
  milkPeak:              number | null
  milkCurrent:           number | null
  breed:                 string | null
  fatherName:            string | null
  cScore:                number | null
  tScore:                number | null
  occurrence:            string | null
  discardRecommendation: string | null
  mastitisDays:          number | null
  ccsThousand:           number | null
  isCloseUp:             boolean
  rawRow:                Record<string, string>
}

export interface VeterinaryCsvParseError {
  lineNumber: number
  rawLine:    string
  reason:     string
}

export interface ParsedVeterinaryCsvResult {
  rows:        ParsedVeterinaryRow[]
  errors:      VeterinaryCsvParseError[]
  totalRows:   number
  validRows:   number
  invalidRows: number
}

// ─── Internal field keys ──────────────────────────────────

type RawRowKey =
  | 'externalCode' | 'animalName' | 'parityNumber'
  | 'lastCalvingDate' | 'rp' | 'sx' | 'inseminationDate'
  | 'inseminationNumber' | 'reportDays' | 'bullName'
  | 'expectedCalvingDate' | 'milkPeak' | 'milkCurrent'
  | 'breed' | 'fatherName' | 'cScore' | 'tScore'
  | 'occurrence' | 'discardRecommendation' | 'mastitisDays'
  | 'ccsThousand' | 'rawGroupLabel'

// ─── Header → field mapping ───────────────────────────────

const HEADER_MAP: Readonly<Record<string, RawRowKey>> = {
  'codigo':              'externalCode',
  'code':                'externalCode',
  'cod':                 'externalCode',
  'nome':                'animalName',
  'name':                'animalName',
  'animal':              'animalName',
  'np':                  'parityNumber',
  'numero de partos':    'parityNumber',
  'no de partos':        'parityNumber',
  'ultimo parto':        'lastCalvingDate',
  'data parto':          'lastCalvingDate',
  'parto':               'lastCalvingDate',
  'rp':                  'rp',
  'sx':                  'sx',
  'inseminacao':         'inseminationDate',
  'data inseminacao':    'inseminationDate',
  'inseminacao data':    'inseminationDate',
  'no':                  'inseminationNumber',
  'num':                 'inseminationNumber',
  'n':                   'inseminationNumber',
  'numero ia':           'inseminationNumber',
  'n inseminacao':       'inseminationNumber',
  'dias':                'reportDays',
  'reprodutor':          'bullName',
  'touro':               'bullName',
  'bull':                'bullName',
  'dt parto provavel':   'expectedCalvingDate',
  'parto previsto':      'expectedCalvingDate',
  'parto provavel':      'expectedCalvingDate',
  'data parto previsto': 'expectedCalvingDate',
  'pico/sc':             'milkPeak',
  'pico':                'milkPeak',
  'prod/sc':             'milkCurrent',
  'prod':                'milkCurrent',
  'producao':            'milkCurrent',
  'raca':                'breed',
  'pai':                 'fatherName',
  'c':                   'cScore',
  'cc':                  'cScore',
  'condicao corporal':   'cScore',
  't':                   'tScore',
  'tt':                  'tScore',
  'ocorrencia':          'occurrence',
  'ocorrencias':         'occurrence',
  'descarte':            'discardRecommendation',
  'recomendacao':        'discardRecommendation',
  'descarte recomendado':'discardRecommendation',
  'dias de mamite':      'mastitisDays',
  'mamite dias':         'mastitisDays',
  'mamite':              'mastitisDays',
  'dias mamite':         'mastitisDays',
  'ccs x 1000':          'ccsThousand',
  'ccs':                 'ccsThousand',
  'grupo':               'rawGroupLabel',
  'group':               'rawGroupLabel',
  'secao':               'rawGroupLabel',
  'categoria':           'rawGroupLabel',
  'categoria animal':    'rawGroupLabel',
  'lote':                'rawGroupLabel',
}

function lookupHeader(normalized: string): RawRowKey | null {
  const direct = HEADER_MAP[normalized]
  if (direct !== undefined) return direct
  const key = Object.keys(HEADER_MAP).find((k) => normalized.includes(k) || k.includes(normalized))
  return key !== undefined ? (HEADER_MAP[key] ?? null) : null
}

// ─── CSV injection prevention ─────────────────────────────

export function sanitizeCsvCell(value: string): string {
  const v = value.trim()
  const first = v.charAt(0)
  if (first && ['=', '+', '-', '@', '\t', '\r'].includes(first)) {
    return v.slice(1).trim()
  }
  return v
}

// ─── Header normalization ─────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeHeader(h: string): string {
  return stripAccents(h)
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

// ─── Date parsing ─────────────────────────────────────────

export function parseDateBr(value: string | null | undefined): Date | null {
  if (!value) return null
  const v = value.trim()
  if (!v || v === '-' || v === '--') return null

  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!m) return null

  // Destructuring with defaults to satisfy noUncheckedIndexedAccess
  const [, dayStr = '', monthStr = '', yearStr = ''] = m
  const day   = parseInt(dayStr,   10)
  const month = parseInt(monthStr, 10)
  const year  = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10)

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year   ||
    date.getMonth()    !== month - 1 ||
    date.getDate()     !== day
  ) return null

  return date
}

// ─── Number parsing ───────────────────────────────────────

export function parseNumberBr(value: string | null | undefined): number | null {
  if (!value) return null
  const v = value.trim()
  if (!v || v === '-' || v === '--') return null
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseIntValue(value: string | null | undefined): number | null {
  if (!value) return null
  const v = value.trim()
  if (!v || v === '-' || v === '--') return null
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

// ─── Group mapping ────────────────────────────────────────

const VALID_GROUPS: readonly VeterinaryReportGroup[] = [
  'EMPTY_NORMAL_45D', 'EMPTY_LATE', 'DRY_EMPTY', 'INSEMINATED_OVER_30D',
  'TO_DRY', 'PREGNANT_HEIFER', 'LACTATING_PREGNANT', 'DRY_PREGNANT',
  'CLOSE_UP', 'UNKNOWN',
] as const

export function mapVeterinaryGroup(rawLabel: string | null | undefined): VeterinaryReportGroup {
  if (!rawLabel) return 'UNKNOWN'

  const upper = rawLabel.trim().toUpperCase() as VeterinaryReportGroup
  if ((VALID_GROUPS as readonly string[]).includes(upper)) return upper

  const n = stripAccents(rawLabel).toLowerCase().trim()

  if (n.includes('amojad') || n.includes('close up') || n.includes('pre parto') || n.includes('pre-parto')) return 'CLOSE_UP'
  if ((n.includes('a secar') || n.includes('secar')) && !n.includes('gestand')) return 'TO_DRY'
  if (n.includes('lactac') && n.includes('gestand'))  return 'LACTATING_PREGNANT'
  if (n.includes('seca')   && n.includes('gestand'))  return 'DRY_PREGNANT'
  if (n.includes('novilha') && n.includes('gestand')) return 'PREGNANT_HEIFER'
  if (n.includes('inseminad') && (n.includes('30') || n.includes('mais'))) return 'INSEMINATED_OVER_30D'
  if (n.includes('vazia') && (n.includes('normal') || n.includes('45'))) return 'EMPTY_NORMAL_45D'
  if (n.includes('vazia') && n.includes('atrasad'))   return 'EMPTY_LATE'
  if (n.includes('seca') && n.includes('vazia'))       return 'DRY_EMPTY'
  if (n.includes('vazia'))                             return 'EMPTY_LATE'

  return 'UNKNOWN'
}

// ─── Day meaning inference ────────────────────────────────

export function inferDayMeaning(group: VeterinaryReportGroup): VeterinaryDayMeaning {
  switch (group) {
    case 'EMPTY_NORMAL_45D':
    case 'EMPTY_LATE':
    case 'DRY_EMPTY':
      return 'DAYS_OPEN'
    case 'INSEMINATED_OVER_30D':
      return 'DAYS_SINCE_INSEMINATION'
    case 'PREGNANT_HEIFER':
    case 'LACTATING_PREGNANT':
    case 'DRY_PREGNANT':
    case 'CLOSE_UP':
      return 'DAYS_PREGNANT'
    case 'TO_DRY':
      return 'DAYS_POSTPARTUM'
    default:
      return 'UNKNOWN'
  }
}

// ─── RFC 4180 CSV line parser ─────────────────────────────

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current  = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line.charAt(i)
    if (char === '"') {
      if (inQuotes && line.charAt(i + 1) === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function detectDelimiter(firstLine: string): string {
  const commas     = (firstLine.match(/,/g)  ?? []).length
  const semicolons = (firstLine.match(/;/g)  ?? []).length
  const tabs       = (firstLine.match(/\t/g) ?? []).length
  if (tabs >= commas && tabs >= semicolons) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

// ─── Row normalizer ───────────────────────────────────────

export function normalizeVeterinaryRow(
  fields: Record<string, string>,
  rawRow: Record<string, string>,
  lineNumber: number,
): { row: ParsedVeterinaryRow | null; error: VeterinaryCsvParseError | null } {
  const reportGroup = mapVeterinaryGroup(fields['rawGroupLabel'] ?? null)

  const externalCode = fields['externalCode'] ? sanitizeCsvCell(fields['externalCode']) || null : null
  const animalName   = fields['animalName']   ? sanitizeCsvCell(fields['animalName'])   || null : null

  if (!externalCode && !animalName) {
    return {
      row: null,
      error: {
        lineNumber,
        rawLine: JSON.stringify(rawRow),
        reason:  'Linha sem código nem nome — não é possível identificar o animal',
      },
    }
  }

  const row: ParsedVeterinaryRow = {
    externalCode,
    animalName,
    rawGroupLabel:         fields['rawGroupLabel'] ? sanitizeCsvCell(fields['rawGroupLabel']) || null : null,
    reportGroup,
    parityNumber:          parseIntValue(fields['parityNumber']),
    lastCalvingDate:       parseDateBr(fields['lastCalvingDate']),
    rp:                    fields['rp']  ? sanitizeCsvCell(fields['rp'])  || null : null,
    sx:                    fields['sx']  ? sanitizeCsvCell(fields['sx'])  || null : null,
    inseminationDate:      parseDateBr(fields['inseminationDate']),
    inseminationNumber:    parseIntValue(fields['inseminationNumber']),
    reportDays:            parseIntValue(fields['reportDays']),
    dayMeaning:            inferDayMeaning(reportGroup),
    bullName:              fields['bullName']      ? sanitizeCsvCell(fields['bullName'])      || null : null,
    expectedCalvingDate:   parseDateBr(fields['expectedCalvingDate']),
    milkPeak:              parseNumberBr(fields['milkPeak']),
    milkCurrent:           parseNumberBr(fields['milkCurrent']),
    breed:                 fields['breed']         ? sanitizeCsvCell(fields['breed'])         || null : null,
    fatherName:            fields['fatherName']    ? sanitizeCsvCell(fields['fatherName'])    || null : null,
    cScore:                parseNumberBr(fields['cScore']),
    tScore:                parseNumberBr(fields['tScore']),
    occurrence:            fields['occurrence']    ? sanitizeCsvCell(fields['occurrence'])    || null : null,
    discardRecommendation: fields['discardRecommendation'] ? sanitizeCsvCell(fields['discardRecommendation']) || null : null,
    mastitisDays:          parseIntValue(fields['mastitisDays']),
    ccsThousand:           parseNumberBr(fields['ccsThousand']),
    isCloseUp:             reportGroup === 'CLOSE_UP',
    rawRow,
  }

  return { row, error: null }
}

// ─── Main entry point ─────────────────────────────────────

export function parseVeterinaryCsv(fileContent: string): ParsedVeterinaryCsvResult {
  const rows:   ParsedVeterinaryRow[]     = []
  const errors: VeterinaryCsvParseError[] = []

  const lines = fileContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return { rows: [], errors: [], totalRows: 0, validRows: 0, invalidRows: 0 }
  }

  const firstLine = lines[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const rawHeaders: string[] = parseCsvLine(firstLine, delimiter).map((h) => h.trim())
  const normHeaders: string[] = rawHeaders.map(normalizeHeader)

  // Map each column index → internal field key
  const fieldIndex: (RawRowKey | null)[] = normHeaders.map((h) => lookupHeader(h))

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue

    try {
      const cells: string[] = parseCsvLine(line, delimiter)

      const fieldValues:    Record<string, string> = {}
      const originalRaw: Record<string, string> = {}

      for (let j = 0; j < rawHeaders.length; j++) {
        const header    = rawHeaders[j] ?? ''
        const cellValue = (cells[j] ?? '').trim()
        originalRaw[header] = cellValue

        const fieldKey = fieldIndex[j] ?? null
        if (fieldKey !== null) fieldValues[fieldKey] = cellValue
      }

      const { row, error } = normalizeVeterinaryRow(fieldValues, originalRaw, i + 1)

      if (error) errors.push(error)
      else if (row) rows.push(row)
    } catch (e) {
      errors.push({
        lineNumber: i + 1,
        rawLine:    line,
        reason:     e instanceof Error ? e.message : 'Erro inesperado ao processar linha',
      })
    }
  }

  return {
    rows,
    errors,
    totalRows:   rows.length + errors.length,
    validRows:   rows.length,
    invalidRows: errors.length,
  }
}
