/**
 * Zustand store para fila offline de registros de leite.
 *
 * Persiste no localStorage. Quando o usuário está sem conexão,
 * os registros ficam na fila e são enviados assim que a conexão
 * for restabelecida.
 *
 * Uso:
 *   const { queue, add, remove } = useMilkQueue()
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Tipos ─────────────────────────────────────────────────

export interface MilkQueueItem {
  id:         string
  farmId:     string
  animalId:   string
  animalTag:  string
  animalName: string | null
  liters:     number
  shift:      'MORNING' | 'AFTERNOON' | 'EVENING'
  recordedAt: string  // ISO string
  retries:    number
  createdAt:  string  // ISO string
}

interface MilkQueueStore {
  queue:     MilkQueueItem[]
  add:       (item: Omit<MilkQueueItem, 'id' | 'retries' | 'createdAt'>) => void
  remove:    (id: string) => void
  increment: (id: string) => void
  clear:     () => void
}

// ─── Store ─────────────────────────────────────────────────

export const useMilkQueue = create<MilkQueueStore>()(
  persist(
    (set) => ({
      queue: [],

      add: (item) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...item,
              id:        crypto.randomUUID(),
              retries:   0,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      remove: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),

      increment: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, retries: item.retries + 1 } : item,
          ),
        })),

      clear: () => set({ queue: [] }),
    }),
    {
      name:    'bovcontrol-milk-queue',
      version: 1,
    },
  ),
)
