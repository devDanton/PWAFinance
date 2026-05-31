'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { createTransaction, deleteTransaction, toggleTransactionPaid, updateTransaction } from '@/app/actions/transactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { SubmitButton } from '@/components/ui/submit-button'

export function TransactionList({ 
  initialTransactions, 
  workspaces, 
  cards 
}: { 
  initialTransactions: any[], 
  workspaces: any[], 
  cards: any[] 
}) {
  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  const [editingTx, setEditingTx] = useState<any>(null)
  const [deletingTx, setDeletingTx] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTransactions = initialTransactions.filter((tx) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      tx.description?.toLowerCase().includes(searchLower) ||
      tx.category?.toLowerCase().includes(searchLower) ||
      tx.workspaces?.name?.toLowerCase().includes(searchLower) ||
      (tx.credit_cards?.name && tx.credit_cards.name.toLowerCase().includes(searchLower))
    )
  })

  const filteredCards = cards.filter(c => c.workspace_id === selectedWorkspace)

  async function handleSave(formData: FormData) {
    if (editingTx) {
      await updateTransaction(editingTx.id, formData)
    } else {
      await createTransaction(formData)
    }
    setOpen(false)
    setEditingTx(null)
  }

  function handleEdit(tx: any) {
    setEditingTx(tx)
    setSelectedWorkspace(tx.workspace_id)
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
        <Input 
          placeholder="Filtrar por descrição ou categoria..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingTx(null); }}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0} onClick={() => setEditingTx(null)}>
              <Plus className="mr-2 h-4 w-4" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={handleSave} key={editingTx ? editingTx.id : 'new'}>
              <DialogHeader>
                <DialogTitle>{editingTx ? 'Editar Transação' : 'Lançar Transação'}</DialogTitle>
                <DialogDescription>
                  {editingTx ? 'Atualize os dados da transação selecionada.' : 'Insira os dados da nova receita ou despesa.'}
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
                  <Input id="date" name="date" type="date" required defaultValue={editingTx?.date || format(new Date(), 'yyyy-MM-dd')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="due_date">Data de Vencimento (Opcional)</Label>
                  <Input id="due_date" name="due_date" type="date" defaultValue={editingTx?.due_date} />
                  <span className="text-[10px] text-muted-foreground leading-tight">Deixe em branco para calcular automaticamente com base no cartão, ou igualar à compra.</span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" placeholder="Ex: Supermercado" defaultValue={editingTx?.description} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input id="category" name="category" placeholder="Ex: Alimentação" defaultValue={editingTx?.category} required />
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

                <div className="grid gap-2">
                  <Label htmlFor="installments">Parcelas</Label>
                  <Input id="installments" name="installments" type="number" min="1" defaultValue={editingTx?.installments || 1} required />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="is_paid" name="is_paid" value="on" defaultChecked={editingTx ? editingTx.is_paid : false} />
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
              <TableHead>Datas</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Workspace / Cartão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
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
                    <TableCell>{tx.category}</TableCell>
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
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tx)} className="text-muted-foreground h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(tx)} className="text-destructive h-8 w-8">
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
