'use client'

import { useState, useTransition } from 'react'
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

export function TransactionList({ 
  initialTransactions, 
  workspaces, 
  cards,
  categories,
  payers,
  initialSortPreference = 'date:desc',
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

  // Estado do filtro por servidor (Supabase)
  const [serverPeriodMode, setServerPeriodMode] = useState<'month' | 'custom' | 'all'>(
    (currentPeriodMode as 'month' | 'custom' | 'all') || 'month'
  )
  const [serverMonth, setServerMonth] = useState<string>(
    currentSelectedMonth || todayDate.slice(0, 7)
  )
  const [serverDateField, setServerDateField] = useState<'date' | 'due_date'>(
    (currentDateField as 'date' | 'due_date') || 'due_date'
  )
  const [customRangeStart, setCustomRangeStart] = useState<string>(currentStartDate)
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(currentEndDate)

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
    setServerMonth(nextStr)
    setServerPeriodMode('month')
    updateServerPeriod('month', nextStr)
  }

  function handleNextMonth() {
    const [y, m] = serverMonth.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    setServerMonth(nextStr)
    setServerPeriodMode('month')
    updateServerPeriod('month', nextStr)
  }

  function handleCurrentMonth() {
    const currentStr = todayDate.slice(0, 7)
    setServerMonth(currentStr)
    setServerPeriodMode('month')
    updateServerPeriod('month', currentStr)
  }

  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  const [editingTx, setEditingTx] = useState<any>(null)
  const [isCloning, setIsCloning] = useState(false)
  const [deletingTx, setDeletingTx] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPaidStatus, setFilterPaidStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [filterCard, setFilterCard] = useState<string>('all')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [dueStartDate, setDueStartDate] = useState<string>('')
  const [dueEndDate, setDueEndDate] = useState<string>('')
  const [filterPayer, setFilterPayer] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [quickPeriodTarget, setQuickPeriodTarget] = useState<'date' | 'due_date'>('date')

  // Sorting
  const [sortPref, setSortPref] = useState(initialSortPreference)
  const [sortField, sortDir] = sortPref.split(':')

  // Recurrence UI state
  const [isRecurring, setIsRecurring] = useState(false)

  // Toggle do acordeon/gaveta de filtros secundários
  const [showSecondaryFilters, setShowSecondaryFilters] = useState(false)

  // Conta quantos filtros secundários estão ativos
  const activeFiltersCount = [
    Boolean(searchTerm),
    filterPaidStatus !== 'all',
    filterType !== 'all',
    filterCard !== 'all',
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

  // Client-side filtering & sorting
  let filteredTransactions = [...initialTransactions]

  // Apply filters
  filteredTransactions = filteredTransactions.filter((tx) => {
    // Text search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchText = (
        (tx.description?.toLowerCase() || '').includes(searchLower) ||
        (tx.categories?.name?.toLowerCase() || '').includes(searchLower) ||
        (tx.workspaces?.name?.toLowerCase() || '').includes(searchLower) ||
        (tx.credit_cards?.name?.toLowerCase() || '').includes(searchLower) ||
        (tx.payers?.name?.toLowerCase() || '').includes(searchLower)
      )
      if (!matchText) return false
    }

    if (filterType !== 'all' && tx.type !== filterType) return false
    if (filterPaidStatus === 'paid' && !tx.is_paid) return false
    if (filterPaidStatus === 'pending' && tx.is_paid) return false
    if (filterCard !== 'all' && tx.credit_card_id !== filterCard) return false
    if (filterPayer !== 'all' && tx.payer_id !== filterPayer) return false
    if (filterCategory !== 'all' && tx.category_id !== filterCategory) return false
    
    if (minAmount && tx.amount < parseFloat(minAmount)) return false
    if (maxAmount && tx.amount > parseFloat(maxAmount)) return false

    if (startDate && tx.date < startDate) return false
    if (endDate && tx.date > endDate) return false
    
    // Some transactions might not have due_date, fallback to date
    const txDueDate = tx.due_date || tx.date
    if (dueStartDate && txDueDate < dueStartDate) return false
    if (dueEndDate && txDueDate > dueEndDate) return false

    return true
  })

  // Apply sorting (server already sorted initially, but client needs to handle changes)
  filteredTransactions.sort((a, b) => {
    // 1. Tratamento para ordenação por data (compra ou vencimento) como Date real
    if (sortField === 'date' || sortField === 'due_date') {
      const getTimestamp = (tx: Record<string, unknown>, field: string) => {
        const raw = (field === 'due_date' ? (tx.due_date || tx.date) : (tx.date || tx.due_date)) as string | undefined
        if (!raw) return 0
        const dateStr = String(raw).trim()
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (match) {
          const year = parseInt(match[1], 10)
          const month = parseInt(match[2], 10) - 1
          const day = parseInt(match[3], 10)
          return Date.UTC(year, month, day)
        }
        const parsed = new Date(dateStr)
        const t = parsed.getTime()
        return isNaN(t) ? 0 : t
      }

      const timeA = getTimestamp(a, sortField)
      const timeB = getTimestamp(b, sortField)
      return sortDir === 'asc' ? timeA - timeB : timeB - timeA
    }

    // 2. Tratamento para valor numérico (amount)
    if (sortField === 'amount') {
      const numA = Number(a.amount) || 0
      const numB = Number(b.amount) || 0
      return sortDir === 'asc' ? numA - numB : numB - numA
    }

    // 3. Tratamento para status de pagamento (is_paid)
    if (sortField === 'is_paid') {
      const boolA = a.is_paid ? 1 : 0
      const boolB = b.is_paid ? 1 : 0
      return sortDir === 'asc' ? boolA - boolB : boolB - boolA
    }

    // 4. Tratamento para relacionamentos e strings
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

  const filteredCards = cards.filter(c => c.workspace_id === selectedWorkspace)
  const filteredCategories = categories.filter(c => c.workspace_id === selectedWorkspace)
  const filteredPayers = payers.filter(c => c.workspace_id === selectedWorkspace)

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

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(rowId => rowId !== id))
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
    
    setOpen(false)
    setEditingTx(null)
    setIsCloning(false)
    setIsRecurring(false)
  }

  function handleEdit(tx: any) {
    setEditingTx(tx)
    setIsCloning(false)
    setSelectedWorkspace(tx.workspace_id)
    setIsRecurring(false)
    setOpen(true)
  }

  function handleClone(tx: any) {
    setEditingTx(tx)
    setIsCloning(true)
    setSelectedWorkspace(tx.workspace_id)
    setIsRecurring(false)
    setOpen(true)
  }

  function confirmDelete(tx: any) {
    const isInstallment = /\(\d+\/\d+\)$/.test(tx.description)
    if (isInstallment) {
      setDeletingTx(tx)
    } else {
      if (confirm('Tem certeza que deseja deletar esta transação?')) {
        handleDelete(tx.id, false)
      }
    }
  }

  async function handleDelete(id: string, deleteAll: boolean) {
    await deleteTransaction(id, deleteAll)
    setDeletingTx(null)
  }

  async function handleTogglePaid(id: string, currentStatus: boolean) {
    await toggleTransactionPaid(id, !currentStatus)
  }

  // Calculate totals for filtered transactions
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)
    
  const totalBalance = totalIncome - totalExpense

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
    <div className="space-y-4">
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
                      setServerMonth(e.target.value)
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
              setServerDateField(val)
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
              setServerPeriodMode(val)
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
          <span>{showSecondaryFilters ? 'Ocultar Filtros' : 'Mais Filtros & Busca'}</span>
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
            onClick={() => {
              setSearchTerm('')
              setFilterType('all')
              setFilterPaidStatus('all')
              setFilterCategory('all')
              setFilterPayer('all')
              setFilterCard('all')
              setMinAmount('')
              setMaxAmount('')
              setStartDate('')
              setEndDate('')
              setDueStartDate('')
              setDueEndDate('')
            }}
          >
            Limpar {activeFiltersCount} filtro(s) ativo(s)
          </Button>
        )}
      </div>

      {/* Conteúdo Expansível: Filtros Secundários e Cards de Cartão */}
      {showSecondaryFilters && (
        <div className="space-y-4 p-3.5 rounded-xl border bg-muted/20 animate-in fade-in-50 duration-200">
          {/* Cards de Filtro Rápido de Cartões de Crédito */}
          {cards.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <CreditCard className="h-3.5 w-3.5 text-primary" /> Filtrar por cartão de crédito:
                </span>
                {filterCard !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setFilterCard('all')}
                  >
                    Limpar cartão
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() => setFilterCard('all')}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                    filterCard === 'all'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'bg-card hover:bg-muted/50 border-border/70'
                  }`}
                >
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate leading-tight">Todos</div>
                    <div className="text-[10px] text-muted-foreground truncate leading-tight">Todos cartões</div>
                  </div>
                </button>

                {cards.map((card) => {
                  const isSelected = filterCard === card.id
                  const cardTxs = initialTransactions.filter(t => t.credit_card_id === card.id)
                  const cardExpense = cardTxs
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setFilterCard(isSelected ? 'all' : card.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                          : 'bg-card hover:bg-muted/50 border-border/70'
                      }`}
                    >
                      <div
                        className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: card.color || '#3b82f6' }}
                      >
                        <CreditCard className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate leading-tight" title={card.name}>
                          {card.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate leading-tight font-medium">
                          {formatCurrency(cardExpense)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Barra de Busca e Filtros Rápidos (Status, Categorias, etc) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
            <Input 
              placeholder="Buscar transações..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs h-9 bg-card"
            />
            <Select value={filterPaidStatus} onValueChange={(val: 'all' | 'paid' | 'pending') => setFilterPaidStatus(val)}>
              <SelectTrigger className="w-[145px] text-xs h-9 bg-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Apenas Pagas</SelectItem>
                <SelectItem value="pending">Apenas Pendentes</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 bg-card">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filtros</h4>
                    <p className="text-sm text-muted-foreground">Refine sua busca de transações.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label>Status do Pagamento</Label>
                    <Select value={filterPaidStatus} onValueChange={(val: 'all' | 'paid' | 'pending') => setFilterPaidStatus(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="paid">Apenas Pagas</SelectItem>
                        <SelectItem value="pending">Apenas Pendentes</SelectItem>
                      </SelectContent>
                    </Select>

                    <Label>Categoria</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {filteredCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Label>Pagador (Terceiros)</Label>
                    <Select value={filterPayer} onValueChange={setFilterPayer}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {payers.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Valor Mín</Label>
                      <Input type="number" placeholder="0.00" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Valor Máx</Label>
                      <Input type="number" placeholder="999.00" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Período Rápido</Label>
                      <Select value={quickPeriodTarget} onValueChange={(val: any) => setQuickPeriodTarget(val)}>
                        <SelectTrigger className="h-6 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Aplicar na Compra</SelectItem>
                          <SelectItem value="due_date">Aplicar no Vencimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                        const d = new Date(); 
                        if (quickPeriodTarget === 'date') { setStartDate(d.toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }
                        else { setDueStartDate(d.toISOString().split('T')[0]); setDueEndDate(d.toISOString().split('T')[0]); }
                      }}>Hoje</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() - 1);
                        if (quickPeriodTarget === 'date') { setStartDate(d.toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }
                        else { setDueStartDate(d.toISOString().split('T')[0]); setDueEndDate(d.toISOString().split('T')[0]); }
                      }}>Ontem</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                        const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - d.getDay());
                        const end = new Date(d); end.setDate(d.getDate() + (6 - d.getDay()));
                        if (quickPeriodTarget === 'date') { setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); }
                        else { setDueStartDate(start.toISOString().split('T')[0]); setDueEndDate(end.toISOString().split('T')[0]); }
                      }}>Esta Semana</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                        const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1);
                        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                        if (quickPeriodTarget === 'date') { setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); }
                        else { setDueStartDate(start.toISOString().split('T')[0]); setDueEndDate(end.toISOString().split('T')[0]); }
                      }}>Este Mês</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                        const d = new Date(); const start = new Date(d.getFullYear(), 0, 1);
                        const end = new Date(d.getFullYear(), 11, 31);
                        if (quickPeriodTarget === 'date') { setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); }
                        else { setDueStartDate(start.toISOString().split('T')[0]); setDueEndDate(end.toISOString().split('T')[0]); }
                      }}>Este Ano</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Data Compra Início</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Data Compra Fim</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Vencimento Início</Label>
                      <Input type="date" value={dueStartDate} onChange={e => setDueStartDate(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Vencimento Fim</Label>
                      <Input type="date" value={dueEndDate} onChange={e => setDueEndDate(e.target.value)} />
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setFilterType('all'); setFilterPaidStatus('all'); setFilterCategory('all'); setFilterPayer('all'); setFilterCard('all');
                    setMinAmount(''); setMaxAmount(''); 
                    setStartDate(''); setEndDate('');
                    setDueStartDate(''); setDueEndDate('');
                  }}>
                    Limpar Filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Barra de Ações Principais (Apenas Botões de Ação na Direita) */}
      <div className="flex items-center justify-end gap-2">

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex text-xs h-9"
            onClick={() => downloadTransactionTemplateCsv()}
            title="Baixar planilha modelo (CSV) para importação"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Modelo CSV
          </Button>
          <ImportCsvModal workspaces={workspaces} cards={cards} />

          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingTx(null); setIsCloning(false); } }}>
            <DialogTrigger asChild>
              <Button disabled={workspaces.length === 0} onClick={() => { setEditingTx(null); setIsCloning(false); setIsRecurring(false); }}>
                <Plus className="mr-2 h-4 w-4" /> Nova Transação
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={handleSave} key={editingTx ? (isCloning ? 'clone' : editingTx.id) : 'new'}>
              <DialogHeader>
                <DialogTitle>{editingTx ? (isCloning ? 'Clonar Transação' : 'Editar Transação') : 'Lançar Transação'}</DialogTitle>
                <DialogDescription>
                  {editingTx && !isCloning ? 'Atualize os dados da transação selecionada.' : 'Insira os dados da nova receita ou despesa.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid gap-2">
                  <Label htmlFor="workspace_id">Workspace</Label>
                  <Select name="workspace_id" value={selectedWorkspace} onValueChange={setSelectedWorkspace} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select name="type" defaultValue={editingTx?.type || "expense"} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={editingTx?.amount} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">Data da Compra</Label>
                  <Input id="date" name="date" type="date" required defaultValue={isCloning ? todayDate : (editingTx?.date || todayDate)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="due_date">Data de Vencimento (Opcional)</Label>
                  <Input id="due_date" name="due_date" type="date" defaultValue={isCloning ? '' : editingTx?.due_date} />
                  <span className="text-[10px] text-muted-foreground leading-tight">Deixe em branco para calcular automaticamente.</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" placeholder="Ex: Supermercado" defaultValue={editingTx?.description} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category_id">Centro de Custo / Categoria</Label>
                  {filteredCategories.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      Nenhuma categoria cadastrada. Crie uma na tela de categorias primeiro.
                    </div>
                  ) : (
                    <Select name="category_id" defaultValue={editingTx?.category_id || undefined} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payer_id">Pagador / Terceiro (Opcional)</Label>
                  <Select name="payer_id" defaultValue={editingTx?.payer_id || "none"}>
                    <SelectTrigger>
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

                <div className="grid gap-2">
                  <Label htmlFor="credit_card_id">Cartão de Crédito (Opcional)</Label>
                  <Select name="credit_card_id" defaultValue={editingTx?.credit_card_id || "none"}>
                    <SelectTrigger>
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

                {(!editingTx || isCloning) && (
                  <div className="flex items-center space-x-2 pt-2 pb-2 border-b">
                    <Checkbox id="is_recurring" name="is_recurring" checked={isRecurring} onCheckedChange={(val) => setIsRecurring(!!val)} />
                    <Label htmlFor="is_recurring" className="cursor-pointer">É uma assinatura recorrente?</Label>
                  </div>
                )}

                {isRecurring ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="frequency">Frequência</Label>
                      <Select name="frequency" defaultValue="monthly" required>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <input type="hidden" name="next_date" value={editingTx?.date || todayDate} />
                  </>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="installments">Parcelas</Label>
                    <Input id="installments" name="installments" type="number" min="1" defaultValue={isCloning ? 1 : (editingTx?.installments || 1)} required />
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="is_paid" name="is_paid" value="on" defaultChecked={isCloning ? false : (editingTx ? editingTx.is_paid : false)} />
                  <Label htmlFor="is_paid" className="cursor-pointer">Transação paga / concluída</Label>
                </div>
              </div>
              <DialogFooter>
                <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
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
      <div className="hidden md:block rounded-md border bg-card text-card-foreground shadow-sm overflow-x-auto">
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
                const isIncome = tx.type === 'income'
                const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)
                
                const dueDateDisplay = tx.due_date ? tx.due_date : tx.date
                const purchaseDateDisplay = tx.date

                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(tx.id)}
                        onCheckedChange={(c) => handleSelectRow(tx.id, !!c)}
                      />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(dueDateDisplay + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {format(new Date(purchaseDateDisplay + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {isIncome ? <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                          <span className="truncate">{tx.description}</span>
                          {tx.installments > 1 && <span className="text-xs text-muted-foreground ml-1 shrink-0">({tx.installments}x)</span>}
                        </div>
                        {tx.payers && (
                          <div className="flex items-center ml-6">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                              Pagador: {tx.payers.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.categories ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${tx.categories.color}20`, color: tx.categories.color }}>
                          {tx.categories.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sem categoria</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{tx.workspaces?.name}</div>
                      {tx.credit_cards && <div className="text-xs text-muted-foreground">{tx.credit_cards.name}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={tx.is_paid} 
                          onCheckedChange={() => handleTogglePaid(tx.id, tx.is_paid)} 
                        />
                        <span className={`text-sm ${tx.is_paid ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                          {tx.is_paid ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isIncome ? 'text-emerald-500' : ''}`}>
                      {isIncome ? '+' : '-'}{formattedAmount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const hasSplit = localSplitOverrides[tx.id] !== undefined 
                            ? localSplitOverrides[tx.id] 
                            : Boolean(tx.has_splits || (tx.splits_count && tx.splits_count > 0))

                          return (
                            <Button 
                              variant={hasSplit ? "secondary" : "ghost"} 
                              size="icon" 
                              onClick={() => setSplittingTx(tx)} 
                              className={`h-8 w-8 transition-colors ${
                                hasSplit 
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30' 
                                  : 'text-muted-foreground hover:text-primary'
                              }`} 
                              title={hasSplit ? "Despesa com Rateio (Clique para gerenciar)" : "Ratear Despesa"}
                            >
                              <Split className="h-4 w-4" />
                            </Button>
                          )
                        })()}
                        <Button variant="ghost" size="icon" onClick={() => handleClone(tx)} className="text-muted-foreground h-8 w-8" title="Clonar">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tx)} className="text-muted-foreground h-8 w-8" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(tx)} className="text-destructive h-8 w-8" title="Deletar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* VISÃO MOBILE: Lista em Cards Compactos Estilo PWA/App Bancário */}
      <div className="block md:hidden space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
            Nenhuma transação encontrada.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIncome = tx.type === 'income'
            const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)
            const dueDateDisplay = tx.due_date ? tx.due_date : tx.date
            const hasSplit = localSplitOverrides[tx.id] !== undefined 
              ? localSplitOverrides[tx.id] 
              : Boolean(tx.has_splits || (tx.splits_count && tx.splits_count > 0))

            return (
              <div
                key={tx.id}
                className="rounded-xl border bg-card p-3 shadow-2xs space-y-2 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(tx.id, tx.is_paid)}
                      className="mt-0.5 shrink-0"
                      title={tx.is_paid ? 'Marcar como pendente' : 'Marcar como pago'}
                    >
                      <Checkbox checked={tx.is_paid} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isIncome ? (
                          <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className="font-semibold text-xs text-foreground truncate">
                          {tx.description}
                        </span>
                        {tx.installments > 1 && (
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            ({tx.installments}x)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          Venc: {format(new Date(dueDateDisplay + 'T12:00:00'), 'dd/MM/yy')}
                        </span>
                        {tx.credit_cards && (
                          <span className="inline-flex items-center gap-1">
                            • <span>{tx.credit_cards.name}</span>
                          </span>
                        )}
                        {tx.payers && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.2 text-[9px] font-medium text-blue-800 dark:text-blue-300">
                            {tx.payers.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-bold text-xs sm:text-sm ${isIncome ? 'text-emerald-500' : 'text-foreground'}`}>
                      {isIncome ? '+' : '-'}{formattedAmount}
                    </div>
                    <div className="text-[10px] mt-0.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded-full font-medium ${tx.is_paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {tx.is_paid ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px]">
                  <div>
                    {tx.categories ? (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
                        style={{ backgroundColor: `${tx.categories.color}20`, color: tx.categories.color }}
                      >
                        {tx.categories.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Sem categoria</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant={hasSplit ? "secondary" : "ghost"} 
                      size="icon" 
                      onClick={() => setSplittingTx(tx)} 
                      className="h-6 w-6 text-muted-foreground"
                      title="Rateio"
                    >
                      <Split className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleClone(tx)}
                      className="h-6 w-6 text-muted-foreground"
                      title="Clonar"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(tx)}
                      className="h-6 w-6 text-muted-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(tx)}
                      className="h-6 w-6 text-destructive"
                      title="Deletar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
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
