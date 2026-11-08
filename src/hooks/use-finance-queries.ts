'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export const QUERY_KEYS = {
  workspaces: ['workspaces'] as const,
  cards: ['cards'] as const,
  categories: ['categories'] as const,
  payers: ['payers'] as const,
  subscriptions: ['subscriptions'] as const,
  transactions: (period?: string) => ['transactions', period || 'all'] as const,
}

// Hook para Workspaces
export function useWorkspaces(initialData?: any[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEYS.workspaces,
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    initialData,
  })
}

// Hook para Cartões de Crédito
export function useCards(initialData?: any[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEYS.cards,
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*, workspaces(name)').order('name')
      if (error) throw error
      return data || []
    },
    initialData,
  })
}

// Hook para Categorias
export function useCategories(initialData?: any[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*, workspaces(name)').order('name')
      if (error) throw error
      return data || []
    },
    initialData,
  })
}

// Hook para Pagadores
export function usePayers(initialData?: any[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEYS.payers,
    queryFn: async () => {
      const { data, error } = await supabase.from('payers').select('*').order('name')
      if (error) throw error
      return data || []
    },
    initialData,
  })
}

// Hook para Transações
export function useTransactions(periodKey: string, initialData?: any[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['transactions', periodKey],
    queryFn: async () => {
      // periodKey format: "month:2026-11:due_date" or "all:due_date" or "custom:start:end:due_date"
      const [mode, val1, val2, val3] = periodKey.split(':')
      const targetDateField = (mode === 'month' ? val2 : (mode === 'custom' ? val3 : val1)) || 'due_date'

      let query = supabase
        .from('transactions')
        .select('*, workspaces(name), credit_cards(name), categories(name), payers(name)')

      if (mode === 'month') {
        const monthStr = val1 // 'YYYY-MM'
        const [yearStr, mStr] = monthStr.split('-')
        const year = parseInt(yearStr, 10)
        const month = parseInt(mStr, 10)
        const startOfMonth = `${yearStr}-${mStr.padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endOfMonth = `${yearStr}-${mStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        query = query.gte(targetDateField, startOfMonth).lte(targetDateField, endOfMonth)
      } else if (mode === 'custom') {
        const start = val1
        const end = val2
        if (start) query = query.gte(targetDateField, start)
        if (end) query = query.lte(targetDateField, end)
      }

      const { data: txs, error } = await query
      if (error) throw error

      // Buscar splits para associar has_splits
      try {
        const { data: splitsData } = await supabase.from('transaction_splits').select('transaction_id')
        const splitCounts: Record<string, number> = {}
        if (splitsData) {
          splitsData.forEach((s: { transaction_id: string }) => {
            splitCounts[s.transaction_id] = (splitCounts[s.transaction_id] || 0) + 1
          })
        }
        return (txs || []).map(tx => ({
          ...tx,
          has_splits: Boolean(splitCounts[tx.id] && splitCounts[tx.id] > 0),
          splits_count: splitCounts[tx.id] || 0
        }))
      } catch {
        return txs || []
      }
    },
    initialData,
  })
}

// Hook para Assinaturas
export function useSubscriptions(initialData?: any[]) {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEYS.subscriptions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, workspaces(name), credit_cards(name), categories(name, color)')
        .order('description')
      if (error) throw error
      return data || []
    },
    initialData,
  })
}

// Hook para forçar atualização manual de qualquer dado
export function useInvalidateData() {
  const queryClient = useQueryClient()
  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateWorkspaces: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces }),
    invalidateCards: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards }),
    invalidateCategories: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories }),
    invalidatePayers: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payers }),
    invalidateSubscriptions: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscriptions }),
    invalidateTransactions: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  }
}
