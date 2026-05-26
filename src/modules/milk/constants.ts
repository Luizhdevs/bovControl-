/**
 * Constantes visuais compartilhadas do módulo Milk.
 * Fonte única de verdade para emojis e cores de turno.
 *
 * Sistema de leite com DOIS turnos: MORNING e AFTERNOON.
 */

// ─── Turno ─────────────────────────────────────────────────

export const SHIFT_EMOJIS: Record<string, string> = {
  MORNING:   '☀️',
  AFTERNOON: '🌤️',
}

/** Variante completa: texto + fundo + borda (para badges/cards) */
export const SHIFT_COLORS: Record<string, string> = {
  MORNING:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  AFTERNOON: 'text-sky-400   bg-sky-400/10   border-sky-400/20',
}

/** Variante texto-somente (para texto inline sem fundo) */
export const SHIFT_TEXT_COLORS: Record<string, string> = {
  MORNING:   'text-amber-400',
  AFTERNOON: 'text-sky-400',
}

// ─── Categoria de animal (contexto de leite) ───────────────

/** Texto colorido por categoria — usado nos seletores de animal */
export const MILK_CATEGORY_COLORS: Record<string, string> = {
  COW:    'text-purple-400',
  HEIFER: 'text-blue-400',
}
