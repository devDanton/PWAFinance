'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Pencil, Copy, ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, Split, ChevronLeft, ChevronRight, Calendar, Loader2, CreditCard, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createTransaction, deleteTransaction, toggleTransactionPaid, updateTransaction } from '@/app/actions/transactions'
import { updateTransactionSortPreference } from '@/app/actions/preferences'
import { createSubscription } from '@/app/actions/subscriptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { SubmitButton } from '@/components/ui/submit-button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { ImportCsvModal } from './import-csv-modal'
import { BulkActionsBar } from './bulk-actions-bar'
import { downloadTransactionTemplateCsv } from '@/lib/csv-template'
import { SplitTransactionModal, TransactionToSplit } from './split-transaction-modal'
import { DesktopTransactionRow } from './desktop-transaction-row'
import { MobileTransactionCard } from './mobile-transaction-card'
import { useTransactions, useCards, useCategories, usePayers, useWorkspaces, useInvalidateData } from '@/hooks/use-finance-queries'
import { useTransactionFilters } from '@/components/providers/filter-context'

export function TransactionList({ 
  initialTransactions, 
  workspaces: initialWorkspaces, 
  cards: initialCards,
  categories: initialCategories,
  payers: initialPayers,
  initialSortPreference = 'due_date:asc',
  todayDate,
  currentPeriodMode = 'month',
  currentSelectedMonth,
  currentStartDate = '',
  currentEndDate = '',
  currentDateField = 'due_date'
}: { 
  initialTransactions: any[], 
  workspaces: any[], 
  cards: any[],
  categories: any[],
  payers: any[],
  initialSortPreference?: string,
  todayDate: string,
  currentPeriodMode?: string,
  currentSelectedMonth?: string,
  currentStartDate?: string,
  currentEndDate?: string,
  currentDateField?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Sincroniza o estado do período quando a URL muda (SSR)
  const serverPeriodMode = (currentPeriodMode as 'month' | 'custom' | 'all') || 'month'
  const serverMonth = currentSelectedMonth || todayDate.slice(0, 7)
  const serverDateField = (currentDateField as 'date' | 'due_date') || 'due_date'
  const [customRangeStart, setCustomRangeStart] = useState<string>(currentStartDate)
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(currentEndDate)

  // Chave de período do cache
  const periodKey = serverPeriodMode === 'month' 
    ? `month:${serverMonth}:${serverDateField}`
    : (serverPeriodMode === 'custom' ? `custom:${customRangeStart}:${customRangeEnd}:${serverDateField}` : `all:${serverDateField}`)

  // Hooks TanStack Query com cache Stale-While-Revalidate
  const { data: transactions = [] } = useTransactions(periodKey, initialTransactions)
  const { data: workspaces = [] } = useWorkspaces(initialWorkspaces)
  const { data: cards = [] } = useCards(initialCards)
  const { data: categories = [] } = useCategories(initialCategories)
  const { data: payers = [] } = usePayers(initialPayers)
  const { invalidateTransactions } = useInvalidateData()

  function updateServerPeriod(mode: 'month' | 'custom' | 'all', newMonth?: string, start?: string, end?: string, field?: 'date' | 'due_date') {
    const params = new URLSearchParams(searchParams.toString())
    const targetField = field || serverDateField

    params.set('dateField', targetField)
    params.set('period', mode)

    if (mode === 'month') {
      const m = newMonth || serverMonth
      params.set('month', m)
      params.delete('startDate')
      params.delete('endDate')
    } else if (mode === 'custom') {
      params.delete('month')
      if (start) params.set('startDate', start); else params.delete('startDate')
      if (end) params.set('endDate', end); else params.delete('endDate')
    } else {
      // all
      params.delete('month')
      params.delete('startDate')
      params.delete('endDate')
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function handlePrevMonth() {
    const [y, m] = serverMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const nextStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    updateServerPeriod('month', nextStr)
  }

  function handleNextMonth() {
    const [y, m] = serverMonth.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    updateServerPeriod('month', nextStr)
  }

  function handleCurrentMonth() {
    const currentStr = todayDate.slice(0, 7)
    updateServerPeriod('month', currentStr)
  }

  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  const [editingTx, setEditingTx] = useState<any>(null)
  const [isCloning, setIsCloning] = useState(false)
  const [deletingTx, setDeletingTx] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Filters compartilhados via Context (permanecem salvos na troca de abas)
  const { filters, setFilters, resetFilters } = useTransactionFilters()

  const searchTerm = filters.searchTerm
  const filterType = filters.filterType
  const filterPaidStatus = filters.filterPaidStatus
  const selectedCardIds = filters.selectedCardIds || []
  const minAmount = filters.minAmount
  const maxAmount = filters.maxAmount
  const startDate = filters.startDate
  const endDate = filters.endDate
  const dueStartDate = filters.dueStartDate
  const dueEndDate = filters.dueEndDate
  const filterPayer = filters.filterPayer
  const filterCategory = filters.filterCategory
  const sortPref = filters.sortPref || initialSortPreference
  const [sortField, sortDir] = sortPref.split(':')

  const setSearchTerm = (val: string) => setFilters(prev => ({ ...prev, searchTerm: val }))
  const setSortPref = (val: string) => setFilters(prev => ({ ...prev, sortPref: val }))
  const setFilterType = (val: string) => setFilters(prev => ({ ...prev, filterType: val }))
  const setFilterPaidStatus = (val: 'all' | 'paid' | 'pending') => setFilters(prev => ({ ...prev, filterPaidStatus: val }))
  const setSelectedCardIds = (updater: string[] | ((prev: string[]) => string[])) => {
    setFilters(prev => ({
      ...prev,
      selectedCardIds: typeof updater === 'function' ? updater(prev.selectedCardIds || []) : updater
    }))
  }
  const setMinAmount = (val: string) => setFilters(prev => ({ ...prev, minAmount: val }))
  const setMaxAmount = (val: string) => setFilters(prev => ({ ...prev, maxAmount: val }))
  const setStartDate = (val: string) => setFilters(prev => ({ ...prev, startDate: val }))
  const setEndDate = (val: string) => setFilters(prev => ({ ...prev, endDate: val }))
  const setDueStartDate = (val: string) => setFilters(prev => ({ ...prev, dueStartDate: val }))
  const setDueEndDate = (val: string) => setFilters(prev => ({ ...prev, dueEndDate: val }))
  const setFilterPayer = (val: string) => setFilters(prev => ({ ...prev, filterPayer: val }))
  const setFilterCategory = (val: string) => setFilters(prev => ({ ...prev, filterCategory: val }))

  const [quickPeriodTarget, setQuickPeriodTarget] = useState<'date' | 'due_date'>('date')

  // Recurrence UI state
  const [isRecurring, setIsRecurring] = useState(false)

  // Toggle do acordeon/gaveta de filtros secundários
  const [showSecondaryFilters, setShowSecondaryFilters] = useState(false)

  // Conta quantos filtros secundários estão ativos
  const activeFiltersCount = [
    Boolean(searchTerm),
    filterPaidStatus !== 'all',
    filterType !== 'all',
    selectedCardIds.length > 0,
    filterCategory !== 'all',
    filterPayer !== 'all',
    Boolean(minAmount),
    Boolean(maxAmount),
    Boolean(startDate),
    Boolean(endDate),
    Boolean(dueStartDate),
    Boolean(dueEndDate)
  ].filter(Boolean).length

  // Split Transaction state
  const [splittingTx, setSplittingTx] = useState<TransactionToSplit | null>(null)
  const [localSplitOverrides, setLocalSplitOverrides] = useState<Record<string, boolean>>({})

  // Toggle de seleção múltipla de cartões de crédito
  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId)
      } else {
        return [...prev, cardId]
      }
    })
  }

  const handleSelectAllCards = () => {
    setSelectedCardIds([])
  }

  // Pre-processamento e filtragem memoizada para alta performance no cliente
  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    const searchLower = searchTerm ? searchTerm.toLowerCase().trim() : ''
    const minNum = minAmount ? parseFloat(minAmount) : null
    const maxNum = maxAmount ? parseFloat(maxAmount) : null
    const hasCardFilter = selectedCardIds.length > 0
    const cardSet = hasCardFilter ? new Set(selectedCardIds) : null

    // 1. Filtragem eficiente
    const result = transactions.filter((tx: any) => {
      // Text search
      if (searchLower) {
        const matchText = (
          (tx.description && tx.description.toLowerCase().includes(searchLower)) ||
          (tx.categories?.name && tx.categories.name.toLowerCase().includes(searchLower)) ||
          (tx.workspaces?.name && tx.workspaces.name.toLowerCase().includes(searchLower)) ||
          (tx.credit_cards?.name && tx.credit_cards.name.toLowerCase().includes(searchLower)) ||
          (tx.payers?.name && tx.payers.name.toLowerCase().includes(searchLower))
        )
        if (!matchText) return false
      }

      if (filterType !== 'all' && tx.type !== filterType) return false
      if (filterPaidStatus === 'paid' && !tx.is_paid) return false
      if (filterPaidStatus === 'pending' && tx.is_paid) return false
      if (cardSet && !cardSet.has(tx.credit_card_id)) return false
      if (filterPayer !== 'all' && tx.payer_id !== filterPayer) return false
      if (filterCategory !== 'all' && tx.category_id !== filterCategory) return false
      
      if (minNum !== null && tx.amount < minNum) return false
      if (maxNum !== null && tx.amount > maxNum) return false

      if (startDate && tx.date < startDate) return false
      if (endDate && tx.date > endDate) return false
      
      const txDueDate = tx.due_date || tx.date
      if (dueStartDate && txDueDate < dueStartDate) return false
      if (dueEndDate && txDueDate > dueEndDate) return false

      return true
    })

    // 2. Ordenação eficiente sem regex nem Date parsing repetitivo no comparador
    result.sort((a: any, b: any) => {
      if (sortField === 'date' || sortField === 'due_date') {
        const dateA = sortField === 'due_date' ? (a.due_date || a.date || '') : (a.date || a.due_date || '')
        const dateB = sortField === 'due_date' ? (b.due_date || b.date || '') : (b.date || b.due_date || '')
        if (dateA === dateB) return 0
        const cmp = dateA < dateB ? -1 : 1
        return sortDir === 'asc' ? cmp : -cmp
      }

      if (sortField === 'amount') {
        const numA = Number(a.amount) || 0
        const numB = Number(b.amount) || 0
        return sortDir === 'asc' ? numA - numB : numB - numA
      }

      if (sortField === 'is_paid') {
        const boolA = a.is_paid ? 1 : 0
        const boolB = b.is_paid ? 1 : 0
        return sortDir === 'asc' ? boolA - boolB : boolB - boolA
      }

      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'categories') {
        valA = a.categories?.name || ''
        valB = b.categories?.name || ''
      } else if (sortField === 'description') {
        valA = a.description || ''
        valB = b.description || ''
      }

      const strA = String(valA || '').toLowerCase()
      const strB = String(valB || '').toLowerCase()
      return sortDir === 'asc' 
        ? strA.localeCompare(strB, 'pt-BR') 
        : strB.localeCompare(strA, 'pt-BR')
    })

    return result
  }, [
    transactions,
    searchTerm,
    filterType,
    filterPaidStatus,
    selectedCardIds,
    filterPayer,
    filterCategory,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    dueStartDate,
    dueEndDate,
    sortField,
    sortDir
  ])

  const filteredCards = useMemo(() => cards.filter(c => c.workspace_id === selectedWorkspace), [cards, selectedWorkspace])
  const filteredCategories = useMemo(() => categories.filter(c => c.workspace_id === selectedWorkspace), [categories, selectedWorkspace])
  const filteredPayers = useMemo(() => payers.filter(c => c.workspace_id === selectedWorkspace), [payers, selectedWorkspace])

  const handleSort = (field: string) => {
    if (sortField === field) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc'
      setSortPref(`${field}:${newDir}`)
      updateTransactionSortPreference(`${field}:${newDir}`)
    } else {
      setSortPref(`${field}:desc`)
      updateTransactionSortPreference(`${field}:desc`)
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />
    return sortDir === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTransactions.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  async function handleSave(formData: FormData) {
    const isRec = formData.get('is_recurring') === 'on'
    
    if (isRec && !editingTx && !isCloning) {
      await createSubscription(formData)
    } else {
      if (editingTx && !isCloning) {
        await updateTransaction(editingTx.id, formData)
      } else {
        await createTransaction(formData)
      }
    }
    invalidateTransactions()
    
    setOpen(false)
    setEditingTx(null)
    setIsCloning(false)
    setIsRecurring(false)
  }

  // Callbacks memoizados para evitar re-renderizar todas as linhas ao mudar filtros
  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(rowId => rowId !== id))
    }
  }, [])

  const handleEdit = useCallback((tx: any) => {
    setEditingTx(tx)
    setIsCloning(false)
    setSelectedWorkspace(tx.workspace_id)
    setIsRecurring(false)
    setOpen(true)
  }, [])

  const handleClone = useCallback((tx: any) => {
    setEditingTx(tx)
    setIsCloning(true)
    setSelectedWorkspace(tx.workspace_id)
    setIsRecurring(false)
    setOpen(true)
  }, [])

  const confirmDelete = useCallback((tx: any) => {
    const isInstallment = /\(\d+\/\d+\)$/.test(tx.description)
    if (isInstallment) {
      setDeletingTx(tx)
    } else {
      if (confirm('Tem certeza que deseja deletar esta transação?')) {
        handleDelete(tx.id, false)
      }
    }
  }, [])

  const handleDelete = useCallback(async (id: string, deleteAll: boolean) => {
    await deleteTransaction(id, deleteAll)
    invalidateTransactions()
    setDeletingTx(null)
  }, [invalidateTransactions])

  const handleTogglePaid = useCallback(async (id: string, currentStatus: boolean) => {
    await toggleTransactionPaid(id, !currentStatus)
    invalidateTransactions()
  }, [invalidateTransactions])

  const handleOpenSplit = useCallback((tx: any) => {
    setSplittingTx(tx)
  }, [])

  // Calculate totals for filtered transactions memoizados
  const { totalIncome, totalExpense, totalBalance } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        income += t.amount || 0
      } else if (t.type === 'expense') {
        expense += t.amount || 0
      }
    }
    return {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: income - expense
    }
  }, [filteredTransactions])

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  // Label amigável para o mês selecionado
  const getMonthLabel = (yearMonth: string) => {
    try {
      const [y, m] = yearMonth.split('-').map(Number)
      const date = new Date(y, m - 1, 1)
      const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    } catch {
      return yearMonth
    }
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Barra de Seleção de Período do Supabase */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card p-2.5 sm:p-3 rounded-xl border shadow-xs">
        <div className="flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto">
          {serverPeriodMode === 'month' ? (
            <div className="flex items-center justify-between w-full sm:w-auto gap-1 bg-muted/60 p-1 rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md shrink-0"
                onClick={handlePrevMonth}
                disabled={isPending}
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center justify-center gap-1.5 px-2 flex-1 sm:flex-none">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm min-w-[110px] sm:min-w-[130px] text-center truncate">
                  {getMonthLabel(serverMonth)}
                </span>
                <input
                  type="month"
                  value={serverMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateServerPeriod('month', e.target.value)
                    }
                  }}
                  className="sr-only"
                  id="month-picker"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md shrink-0"
                onClick={handleNextMonth}
                disabled={isPending}
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : serverPeriodMode === 'custom' ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs w-full sm:w-auto">
              <span className="font-semibold text-xs flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Período:
              </span>
              <Input
                type="date"
                value={customRangeStart}
                onChange={(e) => setCustomRangeStart(e.target.value)}
                className="h-7 sm:h-8 w-28 sm:w-32 text-xs"
              />
              <span>-</span>
              <Input
                type="date"
                value={customRangeEnd}
                onChange={(e) => setCustomRangeEnd(e.target.value)}
                className="h-7 sm:h-8 w-28 sm:w-32 text-xs"
              />
              <Button
                size="sm"
                className="h-7 sm:h-8 text-xs px-2.5"
                onClick={() => updateServerPeriod('custom', undefined, customRangeStart, customRangeEnd)}
                disabled={isPending}
              >
                OK
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-xs sm:text-sm">Todas as Transações</span>
            </div>
          )}

          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1 shrink-0" />
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {/* Campo de referência: Compra ou Vencimento */}
          <Select
            value={serverDateField}
            onValueChange={(val: 'date' | 'due_date') => {
              updateServerPeriod(serverPeriodMode, serverMonth, customRangeStart, customRangeEnd, val)
            }}
          >
            <SelectTrigger className="h-8 text-xs w-full sm:w-[135px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Vencimento</SelectItem>
              <SelectItem value="date">Compra</SelectItem>
            </SelectContent>
          </Select>

          {/* Seletor de Modo: Mês / Customizado / Todas */}
          <Select
            value={serverPeriodMode}
            onValueChange={(val: 'month' | 'custom' | 'all') => {
              updateServerPeriod(val, serverMonth, customRangeStart, customRangeEnd)
            }}
          >
            <SelectTrigger className="h-8 text-xs w-full sm:w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Métricas Compactos no Mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-lg border bg-card p-2 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Receitas</div>
          <div className="text-xs sm:text-lg md:text-2xl font-bold text-emerald-500 truncate">
            {formatCurrency(totalIncome)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-2 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Despesas</div>
          <div className="text-xs sm:text-lg md:text-2xl font-bold text-rose-500 truncate">
            {formatCurrency(totalExpense)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-2 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Saldo</div>
          <div className={`text-xs sm:text-lg md:text-2xl font-bold truncate ${totalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(totalBalance)}
          </div>
        </div>
      </div>

      {/* Botão de Toggle para Filtros Secundários (Busca, Status, Cartões, Filtros Avançados) */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs flex items-center gap-2 border-dashed font-medium"
          onClick={() => setShowSecondaryFilters(!showSecondaryFilters)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <span>{showSecondaryFilters ? 'Ocultar Filtros' : 'Filtros'}</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showSecondaryFilters ? 'rotate-180' : ''}`} />
        </Button>

        {activeFiltersCount > 0 && !showSecondaryFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => resetFilters()}
          >
            Limpar {activeFiltersCount} filtro(s) ativo(s)
          </Button>
        )}
      </div>

      {/* Conteúdo Expansível: Filtros Secundários e Cards de Cartão */}
      <div className={`space-y-4 p-3.5 rounded-xl border bg-muted/20 transition-all ${showSecondaryFilters ? 'block' : 'hidden'}`}>
        {/* Cards de Filtro Rápido de Cartões de Crédito com Seleção Múltipla */}
        {cards.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span className="flex items-center gap-1 font-medium">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Filtrar por cartão de crédito:
                {selectedCardIds.length > 0 && (
                  <span className="ml-1 text-[11px] text-primary font-semibold">({selectedCardIds.length} selecionado{selectedCardIds.length > 1 ? 's' : ''})</span>
                )}
              </span>
              {selectedCardIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleSelectAllCards}
                >
                  Limpar seleção
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllCards}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all ${
                  selectedCardIds.length === 0
                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary font-bold'
                    : 'bg-card hover:bg-muted/50 border-border/70 text-muted-foreground'
                }`}
              >
                <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold truncate leading-tight">Todos os cartões</span>
              </button>

              {cards.map((card) => {
                const isSelected = selectedCardIds.includes(card.id)

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleToggleCard(card.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                        : 'bg-card hover:bg-muted/50 border-border/70'
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-md flex items-center justify-center shrink-0 shadow-2xs relative"
                      style={{ backgroundColor: card.color || '#3b82f6' }}
                    >
                      <CreditCard className="h-3 w-3 text-white" />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate leading-tight" title={card.name}>
                      {card.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Barra de Busca e Filtros Avançados Integrados (fora da modal Popover) */}
        <div className="pt-3 border-t border-border/50 space-y-3">
          {/* Linha 1: Busca por texto, Tipo, Status do Pagamento, Categoria e Pagador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Buscar descrição</Label>
              <Input 
                placeholder="Buscar transações..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8.5 bg-card text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8.5 bg-card text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status Pagamento</Label>
              <Select value={filterPaidStatus} onValueChange={(val: 'all' | 'paid' | 'pending') => setFilterPaidStatus(val)}>
                <SelectTrigger className="h-8.5 bg-card text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="paid">Apenas Pagas</SelectItem>
                  <SelectItem value="pending">Apenas Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8.5 bg-card text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Pagador (Terceiro)</Label>
              <Select value={filterPayer} onValueChange={setFilterPayer}>
                <SelectTrigger className="h-8.5 bg-card text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os terceiros</SelectItem>
                  {payers.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Valores e Intervalos de Datas Integrados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Valor Mín</Label>
              <Input type="number" placeholder="0.00" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="h-8.5 bg-card text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Valor Máx</Label>
              <Input type="number" placeholder="999.00" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="h-8.5 bg-card text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Compra De</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8.5 bg-card text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Compra Até</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8.5 bg-card text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vencimento De</Label>
              <Input type="date" value={dueStartDate} onChange={e => setDueStartDate(e.target.value)} className="h-8.5 bg-card text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vencimento Até</Label>
              <Input type="date" value={dueEndDate} onChange={e => setDueEndDate(e.target.value)} className="h-8.5 bg-card text-xs" />
            </div>
          </div>

          {/* Linha 3: Atalhos de Período Rápido e Botão Limpar Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 font-medium">Período rápido:</span>
              <Select value={quickPeriodTarget} onValueChange={(val: any) => setQuickPeriodTarget(val)}>
                <SelectTrigger className="h-7 text-xs w-[140px] bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Na Compra</SelectItem>
                  <SelectItem value="due_date">No Vencimento</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 bg-card" onClick={() => {
                const d = new Date(); 
                if (quickPeriodTarget === 'date') { setStartDate(d.toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }
                else { setDueStartDate(d.toISOString().split('T')[0]); setDueEndDate(d.toISOString().split('T')[0]); }
              }}>Hoje</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 bg-card" onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 1);
                if (quickPeriodTarget === 'date') { setStartDate(d.toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }
                else { setDueStartDate(d.toISOString().split('T')[0]); setDueEndDate(d.toISOString().split('T')[0]); }
              }}>Ontem</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 bg-card" onClick={() => {
                const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - d.getDay());
                const end = new Date(d); end.setDate(d.getDate() + (6 - d.getDay()));
                if (quickPeriodTarget === 'date') { setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); }
                else { setDueStartDate(start.toISOString().split('T')[0]); setDueEndDate(end.toISOString().split('T')[0]); }
              }}>Esta Semana</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 bg-card" onClick={() => {
                const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                if (quickPeriodTarget === 'date') { setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); }
                else { setDueStartDate(start.toISOString().split('T')[0]); setDueEndDate(end.toISOString().split('T')[0]); }
              }}>Este Mês</Button>
            </div>

            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => resetFilters()}>
              <X className="h-3.5 w-3.5 mr-1" /> Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de Ações Principais (Apenas Botões de Ação na Direita) */}
      <div className="flex flex-wrap items-center justify-end gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex text-xs h-9"
          onClick={() => downloadTransactionTemplateCsv()}
          title="Baixar planilha modelo (CSV) para importação"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Modelo CSV
        </Button>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <ImportCsvModal workspaces={workspaces} cards={cards} />

          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingTx(null); setIsCloning(false); } }}>
            <DialogTrigger asChild>
              <Button disabled={workspaces.length === 0} onClick={() => { setEditingTx(null); setIsCloning(false); setIsRecurring(false); }} className="h-9 text-xs sm:text-sm">
                <Plus className="mr-1.5 h-4 w-4" /> Nova Transação
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[480px] p-4 sm:p-6 max-h-[92vh] flex flex-col gap-0 rounded-2xl">
            <form action={handleSave} key={editingTx ? (isCloning ? 'clone' : editingTx.id) : 'new'} className="flex flex-col max-h-[85vh]">
              <DialogHeader className="pb-3 border-b text-left">
                <DialogTitle className="text-base sm:text-lg">
                  {editingTx ? (isCloning ? 'Clonar Transação' : 'Editar Transação') : 'Lançar Transação'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {editingTx && !isCloning ? 'Atualize os dados da transação selecionada.' : 'Insira os dados da nova receita ou despesa.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3.5 py-3 overflow-y-auto px-1 flex-1 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="workspace_id" className="text-xs">Workspace</Label>
                    <Select name="workspace_id" value={selectedWorkspace} onValueChange={setSelectedWorkspace} required>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-1.5">
                    <Label htmlFor="type" className="text-xs">Tipo</Label>
                    <Select name="type" defaultValue={editingTx?.type || "expense"} required>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="amount" className="text-xs">Valor (R$)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={editingTx?.amount} required className="h-9 text-xs sm:text-sm font-semibold" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="date" className="text-xs">Compra</Label>
                    <Input id="date" name="date" type="date" required defaultValue={isCloning ? todayDate : (editingTx?.date || todayDate)} className="h-9 text-xs" />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="due_date" className="text-xs">Vencimento <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></Label>
                    <Input id="due_date" name="due_date" type="date" defaultValue={isCloning ? '' : editingTx?.due_date} className="h-9 text-xs" />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="description" className="text-xs">Descrição</Label>
                  <Input id="description" name="description" placeholder="Ex: Supermercado" defaultValue={editingTx?.description} required className="h-9 text-xs" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="category_id" className="text-xs">Categoria</Label>
                    {filteredCategories.length === 0 ? (
                      <div className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                        Crie na tela de categorias.
                      </div>
                    ) : (
                      <Select name="category_id" defaultValue={editingTx?.category_id || undefined} required>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="credit_card_id" className="text-xs">Cartão <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></Label>
                    <Select name="credit_card_id" defaultValue={editingTx?.credit_card_id || "none"}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {filteredCards.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="payer_id" className="text-xs">Pagador / Terceiro <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></Label>
                  <Select name="payer_id" defaultValue={editingTx?.payer_id || "none"}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {filteredPayers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(!editingTx || isCloning) && (
                  <div className="flex items-center space-x-2 pt-1 pb-1">
                    <Checkbox id="is_recurring" name="is_recurring" checked={isRecurring} onCheckedChange={(val) => setIsRecurring(!!val)} />
                    <Label htmlFor="is_recurring" className="cursor-pointer text-xs">É uma assinatura recorrente?</Label>
                  </div>
                )}

                {isRecurring ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="frequency" className="text-xs">Frequência</Label>
                      <Select name="frequency" defaultValue="monthly" required>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <input type="hidden" name="next_date" value={editingTx?.date || todayDate} />
                  </>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor="installments" className="text-xs">Parcelas</Label>
                    <Input id="installments" name="installments" type="number" min="1" defaultValue={isCloning ? 1 : (editingTx?.installments || 1)} required className="h-9 text-xs" />
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-1 bg-muted/30 p-2 rounded-lg">
                  <Checkbox id="is_paid" name="is_paid" value="on" defaultChecked={isCloning ? false : (editingTx ? editingTx.is_paid : false)} />
                  <Label htmlFor="is_paid" className="cursor-pointer text-xs font-medium">Transação já paga / concluída</Label>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t mt-auto">
                <SubmitButton pendingText="Salvando..." className="w-full sm:w-auto h-9 text-xs">Salvar Transação</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        <Dialog open={!!deletingTx} onOpenChange={(val) => { if (!val) setDeletingTx(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deletar Transação Parcelada</DialogTitle>
              <DialogDescription>
                Esta transação faz parte de um parcelamento. Você deseja deletar apenas esta parcela ou todas as parcelas associadas?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeletingTx(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(deletingTx.id, false)}>Apenas esta</Button>
              <Button variant="destructive" onClick={() => handleDelete(deletingTx.id, true)}>Deletar todas</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* VISÃO DESKTOP: Tabela tradicional completa */}
      <div className="hidden md:block rounded-md border bg-card text-card-foreground shadow-sm overflow-x-auto w-full max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('due_date')}>
                <div className="flex items-center">Vencimento {getSortIcon('due_date')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('date')}>
                <div className="flex items-center">Compra {getSortIcon('date')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('description')}>
                <div className="flex items-center">Descrição {getSortIcon('description')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('categories')}>
                <div className="flex items-center">Categoria {getSortIcon('categories')}</div>
              </TableHead>
              <TableHead>Workspace / Cartão</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('is_paid')}>
                <div className="flex items-center">Status {getSortIcon('is_paid')}</div>
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end">Valor {getSortIcon('amount')}</div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => {
                const hasSplit = localSplitOverrides[tx.id] !== undefined 
                  ? localSplitOverrides[tx.id] 
                  : Boolean(tx.has_splits || (tx.splits_count && tx.splits_count > 0))

                return (
                  <DesktopTransactionRow
                    key={tx.id}
                    tx={tx}
                    isSelected={selectedIds.includes(tx.id)}
                    hasSplit={hasSplit}
                    onSelectRow={handleSelectRow}
                    onTogglePaid={handleTogglePaid}
                    onSplit={handleOpenSplit}
                    onClone={handleClone}
                    onEdit={handleEdit}
                    onDelete={confirmDelete}
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* VISÃO MOBILE: Lista em Cards Compactos Estilo PWA/App Bancário */}
      <div className="block md:hidden space-y-2 w-full max-w-full overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
            Nenhuma transação encontrada.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const hasSplit = localSplitOverrides[tx.id] !== undefined 
              ? localSplitOverrides[tx.id] 
              : Boolean(tx.has_splits || (tx.splits_count && tx.splits_count > 0))

            return (
              <MobileTransactionCard
                key={tx.id}
                tx={tx}
                hasSplit={hasSplit}
                onTogglePaid={handleTogglePaid}
                onSplit={handleOpenSplit}
                onClone={handleClone}
                onEdit={handleEdit}
                onDelete={confirmDelete}
              />
            )
          })
        )}
      </div>
      <BulkActionsBar 
        selectedIds={selectedIds} 
        clearSelection={() => setSelectedIds([])} 
        workspaces={workspaces}
        cards={cards}
        categories={categories}
      />
      <SplitTransactionModal
        transaction={splittingTx}
        payers={payers}
        open={Boolean(splittingTx)}
        onOpenChange={(open) => { if (!open) setSplittingTx(null) }}
        onSuccess={(txId, hasSplits) => {
          setLocalSplitOverrides(prev => ({
            ...prev,
            [txId]: hasSplits
          }))
        }}
      />
    </div>
  )
}
