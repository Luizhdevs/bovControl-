/**
 * Zustand store para fila offline de sessões de ordenha.
 *
 * Persiste no localStorage. Quando o usuário está sem conexão,
 * as sessões ficam na fila e são enviadas assim que a conexão
 * for restabelecida.
 *
 * Dead-letter strategy: após MAX_RETRIES tentativas com falha (ou erro
 * de domínio imediato), o item é movido para 'dead-letter' e não é mais
 * retentado automaticamente — o usuário decide manualmente via /offline.
 *
 * Idempotency key: gerado no momento da criação (UUID). O servidor
 * usa este key para evitar duplicatas em caso de retry (UPSERT seguro).
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Constantes ────────────────────────────────────────────────

export const MAX_RETRIES = 5

// ─── Tipos ─────────────────────────────────────────────────────

export type QueueItemStatus =
  | 'pending'      // aguardando sincronização
  | 'syncing'      // tentativa em andamento
  | 'failed'       // última tentativa falhou (ainda vai tentar)
  | 'dead-letter'  // MAX_RETRIES atingido ou erro de domínio — intervenção manual
  | 'synced'       // sincronizado com sucesso (mantido brevemente para feedback)

export interface MilkQueueItem {
  // Identificação
  id:             string   // UUID local — nunca enviado ao servidor
  idempotencyKey: string   // UUID enviado ao servidor para deduplicação

  // Dados da sessão de ordenha
  farmId:          string
  shift:           'MORNING' | 'AFTERNOON'
  date:            string   // 'YYYY-MM-DD'
  totalLiters:     number
  milkingCows:     number
  notes:           string | null
  participantIds:  string[] | null  // IDs dos animais participantes (null = modo sem seleção)

  // Metadados de sincronização
  status:        QueueItemStatus
  retryCount:    number
  createdAt:     string        // ISO — quando foi enfileirado
  lastAttemptAt: string | null // ISO — última tentativa de sync
  syncedAt:      string | null // ISO — quando foi sincronizado com sucesso
  lastError:     string | null // mensagem de erro da última tentativa
}

// ─── Interface do store ────────────────────────────────────────

interface MilkQueueStore {
  queue: MilkQueueItem[]

  /** Adiciona nova sessão à fila. */
  add: (item: Omit<MilkQueueItem,
    'id' | 'idempotencyKey' | 'status' | 'retryCount' |
    'createdAt' | 'lastAttemptAt' | 'syncedAt' | 'lastError'
  >) => void

  /** Remove item da fila (após sync confirmado ou descarte manual). */
  remove: (id: string) => void

  /** Marca item como "syncing" antes de tentar enviar. */
  markSyncing: (id: string) => void

  /** Marca item como sincronizado com sucesso. */
  markSynced: (id: string) => void

  /** Registra falha na tentativa. Avança para dead-letter se MAX_RETRIES atingido. */
  markFailed: (id: string, error: string) => void

  /** Move item diretamente para dead-letter (erro de domínio irrecuperável). */
  markDeadLetter: (id: string, error: string) => void

  /** Retira item do dead-letter e volta para pending (retry manual). */
  retry: (id: string) => void

  /** Remove todos os itens com status 'synced'. */
  clearSynced: () => void

  /** Remove toda a fila (hard reset). */
  clear: () => void
}

// ─── Store ─────────────────────────────────────────────────────

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
              id:             crypto.randomUUID(),
              idempotencyKey: crypto.randomUUID(),
              status:         'pending',
              retryCount:     0,
              createdAt:      new Date().toISOString(),
              lastAttemptAt:  null,
              syncedAt:       null,
              lastError:      null,
            },
          ],
        })),

      remove: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),

      markSyncing: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? { ...item, status: 'syncing', lastAttemptAt: new Date().toISOString() }
              : item,
          ),
        })),

      markSynced: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? { ...item, status: 'synced', syncedAt: new Date().toISOString(), lastError: null }
              : item,
          ),
        })),

      markFailed: (id, error) =>
        set((state) => ({
          queue: state.queue.map((item) => {
            if (item.id !== id) return item
            const nextRetry = item.retryCount + 1
            return {
              ...item,
              retryCount:    nextRetry,
              lastError:     error,
              lastAttemptAt: new Date().toISOString(),
              status: nextRetry >= MAX_RETRIES ? 'dead-letter' : 'failed',
            }
          }),
        })),

      markDeadLetter: (id, error) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status:        'dead-letter',
                  lastError:     error,
                  lastAttemptAt: new Date().toISOString(),
                }
              : item,
          ),
        })),

      retry: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id && item.status === 'dead-letter'
              ? { ...item, status: 'pending', retryCount: 0, lastError: null }
              : item,
          ),
        })),

      clearSynced: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.status !== 'synced'),
        })),

      clear: () => set({ queue: [] }),
    }),
    {
      name:    'bovcontrol-milk-queue',
      version: 4,
      migrate: (persisted, version) => {
        // v1/v2: shape incompatível — descarta
        // v3→v4: participantIds adicionado — descarta para garantir shape limpo
        if (version < 4) return { queue: [] }
        return persisted as MilkQueueStore
      },
    },
  ),
)
