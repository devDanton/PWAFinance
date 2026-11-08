'use client'

import React, { createContext, useContext, useState } from 'react'

interface TransactionFiltersState {
  searchTerm: string
  filterType: string
  filterPaidStatus: 'all' | 'paid' | 'pending'
  filterCard: string
  filterPayer: string
  filterCategory: string
  minAmount: string
  maxAmount: string
  startDate: string
  endDate: string
  dueStartDate: string
  dueEndDate: string
}

const defaultFilters: TransactionFiltersState = {
  searchTerm: '',
  filterType: 'all',
  filterPaidStatus: 'all',
  filterCard: 'all',
  filterPayer: 'all',
  filterCategory: 'all',
  minAmount: '',
  maxAmount: '',
  startDate: '',
  endDate: '',
  dueStartDate: '',
  dueEndDate: '',
}

interface FilterContextType {
  filters: TransactionFiltersState
  setFilters: React.Dispatch<React.SetStateAction<TransactionFiltersState>>
  resetFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters)

  const resetFilters = () => setFilters(defaultFilters)

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useTransactionFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useTransactionFilters deve ser usado dentro de um FilterProvider')
  }
  return context
}
