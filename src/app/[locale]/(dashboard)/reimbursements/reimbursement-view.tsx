'use client'

import { useState, useTransition, Fragment } from 'react'
import { 
  HandCoins, 
  Calendar, 
  CreditCard, 
  Search, 
  Share2, 
  Check, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Split, 
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Camera,
  Loader2,
  Eye
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toggleSplitPaid, markAllItemsPaid } from '@/app/actions/splits'
import { toggleTransactionPaid } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'

export interface SplitItem {
  id: string;
  payer_id: string;
  amount: number;
  is_paid: boolean;
  notes?: string | null;
  payers?: { name: string } | null;
}

export interface TransactionItem {
  id: string;
  workspace_id: string;
  amount: number;
  date: string;
  due_date?: string;
  description: string;
  credit_card_id?: string | null;
  credit_cards?: { name: string } | null;
  payer_id?: string | null;
  payers?: { name: string } | null;
  is_paid: boolean;
  type?: string;
  splits?: SplitItem[];
}

interface PayerExpenseDetail {
  id: string; // split id or transaction id
  type: 'split' | 'direct';
  txId: string;
  splitId?: string;
  description: string;
  date: string;
  dueDate: string;
  cardName: string;
  amount: number;
  totalTxAmount: number;
  isPaid: boolean;
  isSplit: boolean;
}

interface PayerSummary {
  payerId: string;
  payerName: string;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  expenses: PayerExpenseDetail[];
}

export function ReimbursementView({
  workspaces,
  cards,
  payers,
  transactions,
  todayDate
}: {
  workspaces: Array<{ id: string; name: string }>;
  cards: Array<{ id: string; name: string; workspace_id: string }>;
  payers: Array<{ id: string; name: string; workspace_id: string }>;
  transactions: TransactionItem[];
  todayDate: string;
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // 1. Filtros
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  
  // Mês selecionado no formato YYYY-MM (ex: 2026-09)
  const currentYearMonth = todayDate.substring(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth)
  const [dateField, setDateField] = useState<'due_date' | 'date'>('due_date')
  const [selectedCard, setSelectedCard] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [searchPayer, setSearchPayer] = useState('')

  // Ordenação da lista de terceiros
  const [payerSort, setPayerSort] = useState<'pending_desc' | 'total_desc' | 'name_asc' | 'name_desc'>('pending_desc')

  // Ordenação das tabelas de gastos de cada terceiro
  const [tableSortField, setTableSortField] = useState<'dueDate' | 'date' | 'cardName' | 'description' | 'amount' | 'isPaid' | 'payerName'>('dueDate')
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc')

  // Estado de loading para geração de imagem em alta resolução
  const [generatingImagePayerId, setGeneratingImagePayerId] = useState<string | null>(null)
  const [previewPayer, setPreviewPayer] = useState<PayerSummary | null>(null)

  // Titulares a serem desconsiderados no relatório de cobrança externa
  const [excludedTitulars, setExcludedTitulars] = useState<string[]>(['danton', 'lauren'])
  const [newTitularInput, setNewTitularInput] = useState('')
  const [copiedPayerId, setCopiedPayerId] = useState<string | null>(null)

  // Multi-payer export states
  const [selectedPayers, setSelectedPayers] = useState<string[]>([])
  const [previewMultiPayers, setPreviewMultiPayers] = useState<PayerSummary[] | null>(null)
  const [copiedMulti, setCopiedMulti] = useState(false)

  // Navegação de mês
  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const newY = d.getFullYear()
    const newM = String(d.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(`${newY}-${newM}`)
  }

  function formatMonthName(ym: string) {
    try {
      const [y, m] = ym.split('-').map(Number)
      const d = new Date(y, m - 1, 1)
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    } catch {
      return ym
    }
  }

  function addExcludedTitular() {
    const trimmed = newTitularInput.trim().toLowerCase()
    if (trimmed && !excludedTitulars.includes(trimmed)) {
      setExcludedTitulars([...excludedTitulars, trimmed])
      setNewTitularInput('')
    }
  }

  function removeExcludedTitular(name: string) {
    setExcludedTitulars(excludedTitulars.filter(n => n !== name))
  }

  function handleTableSort(field: 'dueDate' | 'date' | 'cardName' | 'description' | 'amount' | 'isPaid' | 'payerName') {
    if (tableSortField === field) {
      setTableSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setTableSortField(field)
      setTableSortDir(field === 'dueDate' || field === 'date' || field === 'amount' ? 'desc' : 'asc')
    }
  }

  function getTableSortIcon(field: string) {
    if (tableSortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/30 inline" />
    return tableSortDir === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary inline" /> 
      : <ArrowDown className="ml-1 h-3 w-3 text-primary inline" />
  }

  function getSortedExpenses<T extends PayerExpenseDetail & { payerName?: string }>(expenses: T[]): T[] {
    return [...expenses].sort((a, b) => {
      if (tableSortField === 'dueDate') {
        const timeA = new Date((a.dueDate || a.date) + 'T12:00:00Z').getTime() || 0
        const timeB = new Date((b.dueDate || b.date) + 'T12:00:00Z').getTime() || 0
        if (timeA !== timeB) return tableSortDir === 'asc' ? timeA - timeB : timeB - timeA
        return b.amount - a.amount
      }
      if (tableSortField === 'date') {
        const timeA = new Date(a.date + 'T12:00:00Z').getTime() || 0
        const timeB = new Date(b.date + 'T12:00:00Z').getTime() || 0
        if (timeA !== timeB) return tableSortDir === 'asc' ? timeA - timeB : timeB - timeA
        return b.amount - a.amount
      }
      if (tableSortField === 'amount') {
        if (a.amount !== b.amount) {
          return tableSortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount
        }
        return a.cardName.localeCompare(b.cardName, 'pt-BR')
      }
      if (tableSortField === 'isPaid') {
        const pA = a.isPaid ? 1 : 0
        const pB = b.isPaid ? 1 : 0
        if (pA !== pB) return tableSortDir === 'asc' ? pA - pB : pB - pA
        return a.cardName.localeCompare(b.cardName, 'pt-BR')
      }
      if (tableSortField === 'cardName') {
        const cmp = a.cardName.localeCompare(b.cardName, 'pt-BR')
        if (cmp !== 0) return tableSortDir === 'asc' ? cmp : -cmp
        const timeA = new Date((a.dueDate || a.date) + 'T12:00:00Z').getTime() || 0
        const timeB = new Date((b.dueDate || b.date) + 'T12:00:00Z').getTime() || 0
        return timeB - timeA
      }
      if (tableSortField === 'description') {
        const cmp = a.description.localeCompare(b.description, 'pt-BR')
        if (cmp !== 0) return tableSortDir === 'asc' ? cmp : -cmp
        return a.amount - b.amount
      }
      if (tableSortField === 'payerName') {
        const pA = a.payerName || ''
        const pB = b.payerName || ''
        const cmp = pA.localeCompare(pB, 'pt-BR')
        if (cmp !== 0) return tableSortDir === 'asc' ? cmp : -cmp
        return a.cardName.localeCompare(b.cardName, 'pt-BR')
      }
      return 0
    })
  }

  // 2. Agregação e Processamento dos Dados
  const payerMap: Record<string, PayerSummary> = {}

  transactions.forEach(tx => {
    // Filtro de tipo: apenas despesas entram no relatório de acerto de contas
    if (tx.type && tx.type !== 'expense') return

    // Filtro de workspace
    if (selectedWorkspace && tx.workspace_id !== selectedWorkspace) return

    // Filtro de data (due_date ou date)
    const targetDateStr = (dateField === 'due_date' ? (tx.due_date || tx.date) : tx.date) || ''
    if (!targetDateStr.startsWith(selectedMonth)) return

    // Filtro de cartão
    if (selectedCard !== 'all') {
      if (selectedCard === 'none' && tx.credit_card_id) return
      if (selectedCard !== 'none' && tx.credit_card_id !== selectedCard) return
    }

    const cardName = tx.credit_cards?.name || 'À vista / Pix'

    // Cenário A: Transação com Splits
    if (tx.splits && tx.splits.length > 0) {
      tx.splits.forEach(split => {
        const pName = split.payers?.name?.trim() || 'Sem Nome'
        const isTitular = excludedTitulars.includes(pName.toLowerCase())
        if (isTitular) return // Desconsidera Danton e Lauren

        if (!payerMap[pName.toLowerCase()]) {
          payerMap[pName.toLowerCase()] = {
            payerId: split.payer_id,
            payerName: pName,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            expenses: []
          }
        }

        const expense: PayerExpenseDetail = {
          id: split.id,
          type: 'split',
          txId: tx.id,
          splitId: split.id,
          description: tx.description,
          date: tx.date,
          dueDate: tx.due_date || tx.date,
          cardName,
          amount: Number(split.amount),
          totalTxAmount: Number(tx.amount),
          isPaid: Boolean(split.is_paid),
          isSplit: true
        }

        const bucket = payerMap[pName.toLowerCase()]
        bucket.totalAmount += expense.amount
        if (expense.isPaid) bucket.totalPaid += expense.amount
        else bucket.totalPending += expense.amount
        bucket.expenses.push(expense)
      })
    } 
    // Cenário B: Transação Direta com Pagador Único (sem splits)
    else if (tx.payer_id && tx.payers?.name) {
      const pName = tx.payers.name.trim()
      const isTitular = excludedTitulars.includes(pName.toLowerCase())
      if (isTitular) return // Desconsidera Danton e Lauren

      if (!payerMap[pName.toLowerCase()]) {
        payerMap[pName.toLowerCase()] = {
          payerId: tx.payer_id,
          payerName: pName,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          expenses: []
        }
      }

      const expense: PayerExpenseDetail = {
        id: tx.id,
        type: 'direct',
        txId: tx.id,
        description: tx.description,
        date: tx.date,
        dueDate: tx.due_date || tx.date,
        cardName,
        amount: Number(tx.amount),
        totalTxAmount: Number(tx.amount),
        isPaid: Boolean(tx.is_paid),
        isSplit: false
      }

      const bucket = payerMap[pName.toLowerCase()]
      bucket.totalAmount += expense.amount
      if (expense.isPaid) bucket.totalPaid += expense.amount
      else bucket.totalPending += expense.amount
      bucket.expenses.push(expense)
    }
  })

  // Lista de pagadores com filtros
  let payerList = Object.values(payerMap)

  // Filtro por busca de nome
  if (searchPayer.trim()) {
    const q = searchPayer.trim().toLowerCase()
    payerList = payerList.filter(p => p.payerName.toLowerCase().includes(q))
  }

  // Filtro por status
  if (statusFilter === 'pending') {
    payerList = payerList.filter(p => p.totalPending > 0)
  } else if (statusFilter === 'paid') {
    payerList = payerList.filter(p => p.totalPending === 0 && p.totalPaid > 0)
  }

  // Ordenação configurável da lista de pagadores
  if (payerSort === 'pending_desc') {
    payerList.sort((a, b) => b.totalPending - a.totalPending || b.totalAmount - a.totalAmount)
  } else if (payerSort === 'total_desc') {
    payerList.sort((a, b) => b.totalAmount - a.totalAmount || b.totalPending - a.totalPending)
  } else if (payerSort === 'name_asc') {
    payerList.sort((a, b) => a.payerName.localeCompare(b.payerName, 'pt-BR'))
  } else if (payerSort === 'name_desc') {
    payerList.sort((a, b) => b.payerName.localeCompare(a.payerName, 'pt-BR'))
  }

  // Totais Gerais
  const grandTotalAmount = payerList.reduce((sum, p) => sum + p.totalAmount, 0)
  const grandTotalPaid = payerList.reduce((sum, p) => sum + p.totalPaid, 0)
  const grandTotalPending = payerList.reduce((sum, p) => sum + p.totalPending, 0)

  // 3. Ações
  async function handleTogglePaid(expense: PayerExpenseDetail) {
    startTransition(async () => {
      if (expense.type === 'split' && expense.splitId) {
        await toggleSplitPaid(expense.splitId, !expense.isPaid)
      } else {
        await toggleTransactionPaid(expense.txId, !expense.isPaid)
      }
      router.refresh()
    })
  }

  async function handleMarkAllPayerPaid(payer: PayerSummary, isPaid: boolean) {
    startTransition(async () => {
      const splitIds = payer.expenses.filter(e => e.type === 'split' && e.splitId).map(e => e.splitId!)
      const directIds = payer.expenses.filter(e => e.type === 'direct').map(e => e.txId)
      await markAllItemsPaid({ splitIds, directTransactionIds: directIds, isPaid })
      router.refresh()
    })
  }

  function handleCopyWhatsApp(payer: PayerSummary) {
    const monthFormatted = formatMonthName(selectedMonth)
    const pendingExpenses = payer.expenses.filter(e => !e.isPaid)
    const listToPrint = pendingExpenses.length > 0 ? pendingExpenses : payer.expenses
    const sortedExpenses = getSortedExpenses(listToPrint)

    // Agrupa despesas por cartão
    const byCard: Record<string, PayerExpenseDetail[]> = {}
    sortedExpenses.forEach(e => {
      if (!byCard[e.cardName]) byCard[e.cardName] = []
      byCard[e.cardName].push(e)
    })

    let message = `Olá *${payer.payerName}*! Segue o resumo dos seus gastos no cartão em *${monthFormatted}*:\n\n`

    Object.entries(byCard).forEach(([card, items]) => {
      const cardTotal = items.reduce((sum, it) => sum + it.amount, 0)
      const formattedCardTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardTotal)
      message += `💳 *${card}* (Total: *${formattedCardTotal}*):\n`
      items.forEach(it => {
        const dVenc = it.dueDate ? it.dueDate.split('-').reverse().slice(0, 2).join('/') : ''
        const dCompra = it.date ? it.date.split('-').reverse().slice(0, 2).join('/') : ''
        const dateStr = dVenc ? `Venc: ${dVenc} (Compra: ${dCompra})` : `Compra: ${dCompra}`
        const formattedAmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.amount)
        const rateioNote = it.isSplit ? ` _(Rateio de R$ ${it.totalTxAmount.toFixed(2)})_` : ''
        message += `• ${dateStr} - ${it.description}: *${formattedAmt}*${rateioNote}\n`
      })
      message += `\n`
    })

    const totalToPay = pendingExpenses.length > 0 ? payer.totalPending : payer.totalAmount
    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalToPay)
    
    message += `💰 *Total a pagar: ${formattedTotal}*\n`

    navigator.clipboard.writeText(message)
    setCopiedPayerId(payer.payerId)
    setTimeout(() => setCopiedPayerId(null), 3000)
  }

  function handleExportPayerCsv(payer: PayerSummary) {
    const sorted = getSortedExpenses(payer.expenses)
    const headers = ['Vencimento', 'Compra', 'Cartao', 'Descricao', 'Valor_Devido', 'Valor_Total_Compra', 'Rateado', 'Status']
    const rows = sorted.map(e => [
      e.dueDate,
      e.date,
      `"${e.cardName}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      e.totalTxAmount.toFixed(2),
      e.isSplit ? 'Sim' : 'Nao',
      e.isPaid ? 'Pago' : 'Pendente'
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `acerto_${payer.payerName.toLowerCase().replace(/\s+/g, '_')}_${selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Ações Multi-Pagadores
  function togglePayerSelection(payerId: string) {
    setSelectedPayers(prev => 
      prev.includes(payerId) ? prev.filter(id => id !== payerId) : [...prev, payerId]
    )
  }

  function handleCopyMultiWhatsApp(payersToExport: PayerSummary[]) {
    const monthFormatted = formatMonthName(selectedMonth)
    let totalPendingAll = 0

    let message = `🧾 *Acerto de Contas Centralizado* - ${monthFormatted}\n\n`

    payersToExport.forEach(p => {
      const pending = p.expenses.filter(e => !e.isPaid)
      const listToPrint = pending.length > 0 ? pending : p.expenses
      const pTotal = pending.length > 0 ? p.totalPending : p.totalAmount
      totalPendingAll += pTotal

      const sortedExpenses = getSortedExpenses(listToPrint)
      const formattedPTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pTotal)

      message += `👤 *${p.payerName}* (Subtotal: *${formattedPTotal}*):\n`

      sortedExpenses.forEach(it => {
        const dVenc = it.dueDate ? it.dueDate.split('-').reverse().slice(0, 2).join('/') : ''
        const dCompra = it.date ? it.date.split('-').reverse().slice(0, 2).join('/') : ''
        const dateStr = dVenc ? `Venc: ${dVenc} (Compra: ${dCompra})` : `Compra: ${dCompra}`
        const formattedAmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.amount)
        const rateioNote = it.isSplit ? ` _(Rateio de R$ ${it.totalTxAmount.toFixed(2)})_` : ''
        message += `• ${dateStr} - ${it.description} (*${formattedAmt}*)${rateioNote} - Cartão: ${it.cardName}\n`
      })

      message += `\n`
    })

    const formattedGrandTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingAll)
    message += `💰 *Total Geral (Pendente): ${formattedGrandTotal}*\n`

    navigator.clipboard.writeText(message)
    setCopiedMulti(true)
    setTimeout(() => setCopiedMulti(false), 3000)
  }

  function handleOpenMultiReceipt(payers: PayerSummary[]) {
    setPreviewMultiPayers(payers)
  }

  async function handleDownloadMultiImage(elementId: string) {
    try {
      setGeneratingImagePayerId('multi')
      const node = document.getElementById(elementId)
      if (!node) return
      
      const width = Math.max(node.scrollWidth, node.offsetWidth, 920)
      const height = Math.max(node.scrollHeight, node.offsetHeight, 400)

      const dataUrl = await toPng(node, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        skipFonts: true,
        cacheBust: true,
        canvasWidth: width,
        canvasHeight: height,
        width: width,
        height: height,
        style: {
          position: 'static', top: '0px', left: '0px', right: 'auto', bottom: 'auto',
          margin: '0px', zIndex: '1', visibility: 'visible', display: 'block', opacity: '1',
          transform: 'none', width: `${width}px`, minWidth: `${width}px`,
        }
      })

      const link = document.createElement('a')
      link.download = `comprovante_centralizado_${selectedMonth}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Falha ao gerar imagem:', error)
    } finally {
      setGeneratingImagePayerId(null)
    }
  }

  async function handleDownloadPayerImage(payer: PayerSummary, customNodeId?: string) {
    try {
      setGeneratingImagePayerId(payer.payerId)
      const elementId = customNodeId || 'receipt-preview-modal'
      const node = document.getElementById(elementId)
      if (!node) {
        console.error('Elemento do demonstrativo não encontrado:', elementId)
        return
      }

      // Garante captura integral mesmo se houver scroll lateral interno
      const width = Math.max(node.scrollWidth, node.offsetWidth, 820)
      const height = Math.max(node.scrollHeight, node.offsetHeight, 400)

      // Converte para PNG em alta resolução (escala 2.5x)
      const dataUrl = await toPng(node, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        skipFonts: true,
        cacheBust: true,
        canvasWidth: width,
        canvasHeight: height,
        width: width,
        height: height,
        style: {
          position: 'static',
          top: '0px',
          left: '0px',
          right: 'auto',
          bottom: 'auto',
          margin: '0px',
          zIndex: '1',
          visibility: 'visible',
          display: 'block',
          opacity: '1',
          transform: 'none',
          width: `${width}px`,
          minWidth: `${width}px`,
        }
      })

      const link = document.createElement('a')
      const safePayerName = payer.payerName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
      link.download = `comprovante_${safePayerName}_${selectedMonth}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Falha ao gerar imagem do comprovante:', error)
    } finally {
      setGeneratingImagePayerId(null)
    }
  }

  function handleOpenReceiptAndDownload(payer: PayerSummary) {
    setPreviewPayer(payer)
    setTimeout(() => {
      handleDownloadPayerImage(payer, 'receipt-preview-modal')
    }, 400)
  }

  return (
    <div className="space-y-6">
      {/* 1. Header com seletor de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <HandCoins className="h-8 w-8 text-primary" /> Acerto de Contas
          </h1>
          <p className="text-muted-foreground text-sm">
            Relação mensal de gastos no cartão para cobrança e ressarcimento de terceiros.
          </p>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1.5 shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 text-sm font-semibold capitalize min-w-[160px] justify-center">
            <Calendar className="h-4 w-4 text-primary" />
            {formatMonthName(selectedMonth)}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Cards de Totais Gerais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente a Receber</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas de terceiros ainda não reembolsadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total já Reembolsado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valores já quitados neste mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral de Terceiros</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payerList.length} pessoa(s) com gastos no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filtros Avançados & Configuração de Titulares */}
      <Card className="bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Workspace</Label>
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Base da Data</Label>
              <Select value={dateField} onValueChange={(v: 'due_date' | 'date') => setDateField(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Vencimento da Fatura</SelectItem>
                  <SelectItem value="date">Data da Compra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cartão de Crédito</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos os Cartões" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cartões</SelectItem>
                  {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="none">Apenas sem cartão (Pix / Dinheiro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status do Pagamento</Label>
              <Select value={statusFilter} onValueChange={(v: 'all' | 'pending' | 'paid') => setStatusFilter(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Apenas Pendentes</SelectItem>
                  <SelectItem value="paid">Apenas Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gestão de Titulares Desconsiderados */}
          <div className="pt-2 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium mr-1">Titulares desconsiderados (Nós):</span>
              {excludedTitulars.map(name => (
                <span 
                  key={name} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize text-xs"
                >
                  {name}
                  <button 
                    type="button" 
                    onClick={() => removeExcludedTitular(name)}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Remover titular"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <datalist id="payers-list-datalist">
                {payers.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
              <Input 
                list="payers-list-datalist"
                placeholder="Adicionar titular..." 
                className="h-7 text-xs w-36"
                value={newTitularInput}
                onChange={e => setNewTitularInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addExcludedTitular() }}
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addExcludedTitular}>
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Lista de Pessoas / Extratos */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Relação por Terceiro ({payerList.length})</h2>
            {selectedPayers.length > 1 && (
              <Button 
                size="sm" 
                variant="default"
                className="h-8 text-xs gap-1.5 ml-2"
                onClick={() => {
                  const payersToExport = payerList.filter(p => selectedPayers.includes(p.payerId))
                  handleOpenMultiReceipt(payersToExport)
                }}
                disabled={generatingImagePayerId === 'multi'}
              >
                <Share2 className="h-3.5 w-3.5" /> Exportar Selecionados ({selectedPayers.length})
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={payerSort} onValueChange={(v: 'pending_desc' | 'total_desc' | 'name_asc' | 'name_desc') => setPayerSort(v)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Ordenar Terceiros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_desc">Maior Pendente</SelectItem>
                <SelectItem value="total_desc">Maior Total</SelectItem>
                <SelectItem value="name_asc">Nome (A - Z)</SelectItem>
                <SelectItem value="name_desc">Nome (Z - A)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-44 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar terceiro..." 
                value={searchPayer}
                onChange={e => setSearchPayer(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {payerList.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <HandCoins className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhum gasto de terceiro encontrado para este período.</p>
            <p className="text-xs mt-1">
              Verifique os filtros selecionados ou certifique-se de que os lançamentos possuem Pagador ou Rateio vinculado.
            </p>
          </Card>
        ) : (
          payerList.map(payer => {
            const sortedExpenses = getSortedExpenses(payer.expenses)
            const isGeneratingImage = generatingImagePayerId === payer.payerId

            return (
              <Card key={payer.payerId} className="overflow-hidden border shadow-sm">
                {/* Cabeçalho do Pagador */}
                <div className="p-4 bg-muted/30 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedPayers.includes(payer.payerId)} 
                      onCheckedChange={() => togglePayerSelection(payer.payerId)}
                    />
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
                      {payer.payerName.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2">
                        {payer.payerName}
                        {payer.totalPending === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Quitado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Pendente
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {payer.expenses.length} compra(s) vinculada(s)
                      </p>
                    </div>
                  </div>

                  {/* Resumo Financeiro da Pessoa (Total e Pendente) e Ações Rápidas */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 mr-1">
                      <div className="text-right">
                        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total</div>
                        <div className="text-sm sm:text-base font-bold text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payer.totalAmount)}
                        </div>
                      </div>

                      <div className="text-right border-l pl-3">
                        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pendente</div>
                        <div className={`text-sm sm:text-base font-bold ${payer.totalPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payer.totalPending)}
                        </div>
                      </div>
                    </div>

                    {/* Botão Baixar Imagem (Print em Alta Resolução) */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-1.5 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() => handleOpenReceiptAndDownload(payer)}
                      disabled={isGeneratingImage}
                      title="Visualizar e baixar imagem em alta resolução"
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...
                        </>
                      ) : (
                        <>
                          <Camera className="h-3.5 w-3.5" /> Baixar Imagem
                        </>
                      )}
                    </Button>

                    {/* Botão Ver Comprovante */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setPreviewPayer(payer)}
                      title="Visualizar demonstrativo formatado na tela"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver Comprovante
                    </Button>

                    {/* Botão Copiar WhatsApp */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => handleCopyWhatsApp(payer)}
                    >
                      {copiedPayerId === payer.payerId ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5" /> Enviar WhatsApp
                        </>
                      )}
                    </Button>

                    {/* Botão Exportar CSV */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs gap-1"
                      onClick={() => handleExportPayerCsv(payer)}
                      title="Baixar extrato em CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>

                    {/* Marcar Tudo Pago/Pendente */}
                    {payer.totalPending > 0 ? (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleMarkAllPayerPaid(payer, true)}
                        disabled={isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Marcar Pago
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => handleMarkAllPayerPaid(payer, false)}
                        disabled={isPending}
                      >
                        Desfazer Pagamento
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabela de Despesas da Pessoa com Ordenação Interativa */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs hover:bg-transparent">
                        <TableHead className="w-[110px] cursor-pointer select-none" onClick={() => handleTableSort('dueDate')}>
                          <div className="flex items-center">Vencimento {getTableSortIcon('dueDate')}</div>
                        </TableHead>
                        <TableHead className="w-[105px] cursor-pointer select-none" onClick={() => handleTableSort('date')}>
                          <div className="flex items-center">Compra {getTableSortIcon('date')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleTableSort('cardName')}>
                          <div className="flex items-center">Cartão {getTableSortIcon('cardName')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleTableSort('description')}>
                          <div className="flex items-center">Descrição {getTableSortIcon('description')}</div>
                        </TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => handleTableSort('amount')}>
                          <div className="flex items-center justify-end">Valor Devido {getTableSortIcon('amount')}</div>
                        </TableHead>
                        <TableHead className="text-center w-[120px] cursor-pointer select-none" onClick={() => handleTableSort('isPaid')}>
                          <div className="flex items-center justify-center">Status {getTableSortIcon('isPaid')}</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedExpenses.map(expense => (
                        <TableRow key={expense.id} className="text-xs">
                          <TableCell className="whitespace-nowrap font-semibold text-foreground">
                            {expense.dueDate ? expense.dueDate.split('-').reverse().join('/') : expense.date.split('-').reverse().join('/')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {expense.date.split('-').reverse().join('/')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium text-[11px]">
                              <CreditCard className="h-3 w-3" /> {expense.cardName}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <div className="font-medium truncate">{expense.description}</div>
                          </TableCell>
                          <TableCell>
                            {expense.isSplit ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium" title={`Valor total da compra: R$ ${expense.totalTxAmount.toFixed(2)}`}>
                                <Split className="h-3 w-3" /> Rateio (Total R$ ${expense.totalTxAmount.toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Integral</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(expense)}
                              disabled={isPending}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                expense.isPaid 
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25' 
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                              }`}
                            >
                              {expense.isPaid ? (
                                <>
                                  <Check className="h-3 w-3" /> Recebido
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" /> Pendente
                                </>
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/40 font-semibold text-xs">
                        <TableCell colSpan={5} className="text-right">Totais do Terceiro:</TableCell>
                        <TableCell className="text-right font-bold whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="text-foreground">
                              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payer.totalAmount)}
                            </span>
                            <span className={payer.totalPending > 0 ? "text-amber-600 dark:text-amber-400 text-[11px]" : "text-emerald-600 text-[11px]"}>
                              Pendente: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payer.totalPending)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Dialog de Visualização e Impressão do Comprovante */}
      <Dialog open={!!previewPayer} onOpenChange={val => { if (!val) setPreviewPayer(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Comprovante: {previewPayer?.payerName}</span>
            </DialogTitle>
          </DialogHeader>

          {previewPayer && (
            <div className="w-full overflow-x-auto flex justify-center py-2">
              <div 
                id="receipt-preview-modal" 
                style={{ width: '100%', minWidth: '820px', maxWidth: '920px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm"
              >
                {/* Cabeçalho */}
                <div className="border-b border-slate-200 pb-5 mb-6 flex justify-between items-start gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                      Demonstrativo de Gastos e Reembolso
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {previewPayer.payerName}
                    </h2>
                    <div className="text-sm text-slate-600 mt-1 capitalize font-medium">
                      Referência: {formatMonthName(selectedMonth)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                      {previewPayer.totalPending === 0 ? (
                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                          ✓ Tudo Quitado
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-300">
                          ● Pendente de Acerto
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {previewPayer.expenses.length} lançamento(s)
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Total de Gastos
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewPayer.totalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Soma de todas as compras no período
                    </div>
                  </div>

                  <div className={`border rounded-lg p-4 ${previewPayer.totalPending > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${previewPayer.totalPending > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                      Total Pendente a Reembolsar
                    </div>
                    <div className={`text-2xl font-black mt-1 ${previewPayer.totalPending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewPayer.totalPending)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {previewPayer.totalPending > 0 ? 'Valor em aberto a ser transferido' : 'Nenhuma pendência financeira'}
                    </div>
                  </div>
                </div>

                {/* Tabela */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[95px] cursor-pointer select-none" onClick={() => handleTableSort('dueDate')}>
                          Vencimento {tableSortField === 'dueDate' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[95px] cursor-pointer select-none" onClick={() => handleTableSort('date')}>
                          Compra {tableSortField === 'date' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[130px] cursor-pointer select-none" onClick={() => handleTableSort('cardName')}>
                          Cartão {tableSortField === 'cardName' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 min-w-[170px] cursor-pointer select-none" onClick={() => handleTableSort('description')}>
                          Descrição {tableSortField === 'description' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap w-[110px] cursor-pointer select-none" onClick={() => handleTableSort('amount')}>
                          Valor {tableSortField === 'amount' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap w-[90px] cursor-pointer select-none" onClick={() => handleTableSort('isPaid')}>
                          Status {tableSortField === 'isPaid' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {getSortedExpenses(previewPayer.expenses).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {item.dueDate ? item.dueDate.split('-').reverse().join('/') : item.date.split('-').reverse().join('/')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {item.date.split('-').reverse().join('/')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                            {item.cardName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium break-words">
                            {item.description}
                            {item.isSplit && (
                              <span className="ml-1.5 text-[10px] text-blue-600 font-semibold whitespace-nowrap">
                                (Rateio de R$ {item.totalTxAmount.toFixed(2)})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {item.isPaid ? (
                              <span className="text-emerald-700 font-bold text-[11px]">
                                Quitado
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold text-[11px]">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700 uppercase">
                          Totais:
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 text-sm whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewPayer.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                          {previewPayer.totalPending > 0 ? (
                            <span className="text-amber-700 font-extrabold">
                              Aberto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewPayer.totalPending)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-extrabold">Quitado</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Rodapé */}
                <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-400 flex justify-between items-center">
                  <div>
                    PWAFinance • Controle Financeiro e Reembolsos
                  </div>
                  <div>
                    Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button 
              variant="default"
              className="gap-1.5"
              onClick={() => previewPayer && handleDownloadPayerImage(previewPayer, 'receipt-preview-modal')}
              disabled={generatingImagePayerId === previewPayer?.payerId}
            >
              {generatingImagePayerId === previewPayer?.payerId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando Imagem...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" /> Baixar Imagem (PNG Alta Resolução)
                </>
              )}
            </Button>
            {previewPayer && (
              <Button 
                variant="outline" 
                className="gap-1.5 text-emerald-700 dark:text-emerald-300"
                onClick={() => handleCopyWhatsApp(previewPayer)}
              >
                <Share2 className="h-4 w-4" /> Enviar WhatsApp
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPreviewPayer(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização Multi-Pagadores (Centralizado) */}
      <Dialog open={!!previewMultiPayers} onOpenChange={val => { if (!val) setPreviewMultiPayers(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[92vh] overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Comprovante Centralizado</span>
            </DialogTitle>
          </DialogHeader>

          {previewMultiPayers && (
            <div className="w-full overflow-x-auto flex justify-center py-2">
              <div 
                id="multi-receipt-preview-modal" 
                style={{ width: '100%', minWidth: '920px', maxWidth: '1050px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm"
              >
                {/* Cabeçalho */}
                <div className="border-b border-slate-200 pb-5 mb-6 flex justify-between items-start gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                      Demonstrativo de Gastos Centralizado
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Acerto de Contas Múltiplo
                    </h2>
                    <div className="text-sm text-slate-600 mt-1 capitalize font-medium">
                      Referência: {formatMonthName(selectedMonth)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400 mt-2">
                      {previewMultiPayers.length} pagadores selecionados
                    </div>
                  </div>
                </div>

                {/* Resumo por Pagador (Centralizado) */}
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {previewMultiPayers.map(p => {
                    const pending = p.expenses.filter(e => !e.isPaid)
                    const pTotalPending = pending.length > 0 ? p.totalPending : p.totalAmount
                    const isAllPaid = pending.length === 0
                    return (
                      <div key={p.payerId} className={`border rounded-lg p-3 ${isAllPaid ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
                        <div className="text-xs font-semibold uppercase text-slate-700 truncate">{p.payerName}</div>
                        <div className={`text-lg font-black mt-1 ${isAllPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pTotalPending)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Tabela */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[95px] cursor-pointer select-none" onClick={() => handleTableSort('dueDate')}>
                          Vencimento {tableSortField === 'dueDate' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[95px] cursor-pointer select-none" onClick={() => handleTableSort('date')}>
                          Compra {tableSortField === 'date' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[130px] cursor-pointer select-none" onClick={() => handleTableSort('cardName')}>
                          Cartão {tableSortField === 'cardName' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 min-w-[150px] cursor-pointer select-none" onClick={() => handleTableSort('description')}>
                          Descrição {tableSortField === 'description' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 whitespace-nowrap w-[120px] cursor-pointer select-none" onClick={() => handleTableSort('payerName')}>
                          Pagador {tableSortField === 'payerName' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap w-[110px] cursor-pointer select-none" onClick={() => handleTableSort('amount')}>
                          Valor {tableSortField === 'amount' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap w-[90px] cursor-pointer select-none" onClick={() => handleTableSort('isPaid')}>
                          Status {tableSortField === 'isPaid' && (tableSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewMultiPayers.map(p => {
                        const list = p.expenses.filter(e => !e.isPaid).length > 0 ? p.expenses.filter(e => !e.isPaid) : p.expenses
                        const sorted = getSortedExpenses(list)
                        const pTotal = list.reduce((sum, e) => sum + e.amount, 0)

                        return (
                          <Fragment key={p.payerId}>
                            {/* Linha separadora do Pagador */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                              <td colSpan={7} className="py-2 px-3 text-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="uppercase tracking-wide text-[11px] text-slate-700 font-bold">
                                    👤 Pagador: <strong className="text-slate-900 text-xs font-black">{p.payerName}</strong> ({list.length} {list.length === 1 ? 'item' : 'itens'})
                                  </span>
                                  <span className="text-xs text-slate-700 font-medium">
                                    Subtotal: <strong className="text-slate-900 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pTotal)}</strong>
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {sorted.map(item => (
                              <tr key={`${p.payerName}-${item.id}`} className="hover:bg-slate-50 bg-white">
                                <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                  {item.dueDate ? item.dueDate.split('-').reverse().join('/') : item.date.split('-').reverse().join('/')}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  {item.date.split('-').reverse().join('/')}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                                  {item.cardName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-800 font-medium break-words">
                                  {item.description}
                                  {item.isSplit && (
                                    <span className="ml-1.5 text-[10px] text-blue-600 font-semibold whitespace-nowrap">
                                      (Rateio de R$ {item.totalTxAmount.toFixed(2)})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                                  {p.payerName}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {item.isPaid ? (
                                    <span className="text-emerald-700 font-bold text-[11px]">Quitado</span>
                                  ) : (
                                    <span className="text-amber-700 font-bold text-[11px]">Pendente</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <tr>
                        <td colSpan={5} className="py-2.5 px-3 text-right text-slate-700 uppercase">
                          Total Geral (Pendente):
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 text-sm whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            previewMultiPayers.reduce((sum, p) => sum + (p.expenses.filter(e => !e.isPaid).length > 0 ? p.totalPending : p.totalAmount), 0)
                          )}
                        </td>
                        <td className="py-2.5 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Rodapé */}
                <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-400 flex justify-between items-center">
                  <div>PWAFinance • Controle Financeiro e Reembolsos</div>
                  <div>Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button 
              variant="default"
              className="gap-1.5"
              onClick={() => previewMultiPayers && handleDownloadMultiImage('multi-receipt-preview-modal')}
              disabled={generatingImagePayerId === 'multi'}
            >
              {generatingImagePayerId === 'multi' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Imagem...</>
              ) : (
                <><Camera className="h-4 w-4" /> Baixar Imagem (PNG)</>
              )}
            </Button>
            {previewMultiPayers && (
              <Button 
                variant="outline" 
                className="gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => handleCopyMultiWhatsApp(previewMultiPayers)}
              >
                {copiedMulti ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                {copiedMulti ? 'Copiado!' : 'Copiar Texto para WhatsApp'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPreviewMultiPayers(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
