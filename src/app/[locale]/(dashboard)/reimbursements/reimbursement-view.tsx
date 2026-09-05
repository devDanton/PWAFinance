'use client'

import { useState, useTransition } from 'react'
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
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

  // Titulares a serem desconsiderados no relatório de cobrança externa
  const [excludedTitulars, setExcludedTitulars] = useState<string[]>(['danton', 'lauren'])
  const [newTitularInput, setNewTitularInput] = useState('')
  const [copiedPayerId, setCopiedPayerId] = useState<string | null>(null)

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

  // 2. Agregação e Processamento dos Dados
  const payerMap: Record<string, PayerSummary> = {}

  transactions.forEach(tx => {
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

  // Lista ordenada de pagadores
  let payerList = Object.values(payerMap).sort((a, b) => b.totalPending - a.totalPending || b.totalAmount - a.totalAmount)

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

    // Agrupa despesas por cartão
    const byCard: Record<string, PayerExpenseDetail[]> = {}
    listToPrint.forEach(e => {
      if (!byCard[e.cardName]) byCard[e.cardName] = []
      byCard[e.cardName].push(e)
    })

    let message = `Olá *${payer.payerName}*! Segue o resumo dos seus gastos no cartão em *${monthFormatted}*:\n\n`

    Object.entries(byCard).forEach(([card, items]) => {
      message += `💳 *${card}*:\n`
      items.forEach(it => {
        const d = it.date.split('-').reverse().slice(0, 2).join('/')
        const formattedAmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.amount)
        const rateioNote = it.isSplit ? ` _(Rateio de R$ ${it.totalTxAmount.toFixed(2)})_` : ''
        message += `• ${d} - ${it.description}: *${formattedAmt}*${rateioNote}\n`
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
    const headers = ['Data', 'Vencimento', 'Cartao', 'Descricao', 'Valor_Devido', 'Valor_Total_Compra', 'Rateado', 'Status']
    const rows = payer.expenses.map(e => [
      e.date,
      e.dueDate,
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
    URL.revokeObjectURL(url)
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Relação por Terceiro ({payerList.length})</h2>
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Buscar terceiro..." 
              value={searchPayer}
              onChange={e => setSearchPayer(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
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
          payerList.map(payer => (
            <Card key={payer.payerId} className="overflow-hidden border shadow-sm">
              {/* Cabeçalho do Pagador */}
              <div className="p-4 bg-muted/30 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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

                {/* Resumo Financeiro da Pessoa e Ações Rápidas */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="text-right mr-2">
                    <div className="text-xs text-muted-foreground">Pendente</div>
                    <div className={`text-base font-bold ${payer.totalPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payer.totalPending)}
                    </div>
                  </div>

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

              {/* Tabela de Despesas da Pessoa */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs hover:bg-transparent">
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead>Cartão</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor Devido</TableHead>
                      <TableHead className="text-center w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payer.expenses.map(expense => (
                      <TableRow key={expense.id} className="text-xs">
                        <TableCell className="whitespace-nowrap font-medium">
                          {expense.date.split('-').reverse().join('/')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium text-[11px]">
                            <CreditCard className="h-3 w-3" /> {expense.cardName}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="font-medium truncate">{expense.description}</div>
                          {expense.dueDate && expense.dueDate !== expense.date && (
                            <div className="text-[10px] text-muted-foreground">
                              Fatura Venc: {expense.dueDate.split('-').reverse().join('/')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.isSplit ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium" title={`Valor total da compra: R$ ${expense.totalTxAmount.toFixed(2)}`}>
                              <Split className="h-3 w-3" /> Rateio (Total R$ {expense.totalTxAmount.toFixed(2)})
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
                </Table>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
