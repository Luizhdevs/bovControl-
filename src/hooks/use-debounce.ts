'use client'

import { useCallback, useRef } from 'react'

/**
 * Retorna uma versão debounced da função fornecida.
 * Útil para inputs de busca — evita requisições a cada tecla.
 */
export function useDebounce<T extends (...args: Parameters<T>) => void>(
  fn:    T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => fn(...args), delay)
    },
    [fn, delay],
  )
}
