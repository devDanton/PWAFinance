'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Pencil, Copy, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { format } from 'date-fns'
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

export function TransactionList({ 
  initialTransactions, 
  workspaces, 
  cards,
  categories,
  initialSortPreference = 'date:desc',
  todayDate
}: { 
  initialTransactions: any[], 
  workspaces: any[], 
  cards: any[],
  categories: any[],
  initialSortPreference?: string,
  todayDate: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  const [editingTx, setEditingTx] = useState<any>(null)
  const [isCloning, setIsCloning] = useState(false)
  const [deletingTx, setDeletingTx] = useState<any>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Sorting
  const [sortPref, setSortPref] = useState(initialSortPreference)
  const [sortField, sortDir] = sortPref.split(':')

  // Recurrence UI state
  const [isRecurring, setIsRecurring] = useState(false)

  // Client-side filtering & sorting
  let filteredTransactions = [...initialTransactions]

  // Apply filters
  filteredTransactions = filteredTransactions.filter((tx) => {
    // Text search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchText = (
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.categories?.name?.toLowerCase().includes(searchLower) ||
        tx.workspaces?.name?.toLowerCase().includes(searchLower) ||
        (tx.credit_cards?.name && tx.credit_cards.name.toLowerCase().includes(searchLower))
      )
      if (!matchText) return false
    }

    if (filterType !== 'all' && tx.type !== filterType) return false
    
    if (minAmount && tx.amount < parseFloat(minAmount)) return false
    if (maxAmount && tx.amount > parseFloat(maxAmount)) return false

    if (startDate && tx.date < startDate) return false
    if (endDate && tx.date > endDate) return false

    return true
  })

  // Apply sorting (server already sorted initially, but client needs to handle changes)
  filteredTransactions.sort((a, b) => {
    let valA = a[sortField]
    let valB = b[sortField]

    if (sortField === 'categories') {
      valA = a.categories?.name || ''
      valB = b.categories?.name || ''
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const filteredCards = cards.filter(c => c.workspace_id === selectedWorkspace)
  const filteredCategories = categories.filter(c => c.workspace_id === selectedWorkspace)

  async function handleSort(field: string) {
    let newDir = 'asc'
    if (sortField === field && sortDir === 'asc') {
      newDir = 'desc'
    }
    const newPref = `${field}:${newDir}`
    setSortPref(newPref)
    await updateTransactionSortPreference(newPref)
  }

  function getSortIcon(field: string) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input 
            placeholder="Buscar transações..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Data Início</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Data Fim</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setFilterType('all'); setMinAmount(''); setMaxAmount(''); setStartDate(''); setEndDate('');
                }}>
                  Limpar Filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

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

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('date')}>
                <div className="flex items-center">Datas {getSortIcon('date')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('description')}>
                <div className="flex items-center">Descrição {getSortIcon('description')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('categories')}>
                <div className="flex items-center">Categoria {getSortIcon('categories')}</div>
              </TableHead>
              <TableHead>Workspace / Cartão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end">Valor {getSortIcon('amount')}</div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income'
                const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)
                
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.due_date ? format(new Date(tx.due_date + 'T12:00:00'), 'dd/MM/yyyy') : format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                        {tx.due_date && tx.due_date !== tx.date && (
                          <span className="text-xs text-muted-foreground">Compra: {format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isIncome ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                        {tx.description}
                        {tx.installments > 1 && <span className="text-xs text-muted-foreground ml-1">({tx.installments}x)</span>}
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
    </div>
  )
}
