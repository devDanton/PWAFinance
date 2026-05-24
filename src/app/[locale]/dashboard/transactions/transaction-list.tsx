'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { format } from 'date-fns'
import { createTransaction, deleteTransaction, toggleTransactionPaid } from '@/app/actions/transactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const [loading, setLoading] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')

  const filteredCards = cards.filter(c => c.workspace_id === selectedWorkspace)

  async function handleCreate(formData: FormData) {
    setLoading(true)
    await createTransaction(formData)
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar esta transação?')) {
      await deleteTransaction(id)
    }
  }

  async function handleTogglePaid(id: string, currentStatus: boolean) {
    await toggleTransactionPaid(id, !currentStatus)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Lançar Transação</DialogTitle>
                <DialogDescription>
                  Insira os dados da nova receita ou despesa.
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
                  <Select name="type" defaultValue="expense" required>
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
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" placeholder="Ex: Supermercado" required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input id="category" name="category" placeholder="Ex: Alimentação" required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="credit_card_id">Cartão de Crédito (Opcional)</Label>
                  <Select name="credit_card_id">
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
                  <Input id="installments" name="installments" type="number" min="1" defaultValue="1" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Workspace / Cartão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                  Nenhuma transação lançada.
                </TableCell>
              </TableRow>
            ) : (
              initialTransactions.map((tx) => {
                const isIncome = tx.type === 'income'
                const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)
                
                return (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), 'dd/MM/yyyy')}</TableCell>
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
                      <Button 
                        variant={tx.is_paid ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => handleTogglePaid(tx.id, tx.is_paid)}
                        className={`h-7 px-2 text-xs ${tx.is_paid ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                      >
                        {tx.is_paid ? 'Pago' : 'Pendente'}
                      </Button>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isIncome ? 'text-emerald-500' : ''}`}>
                      {isIncome ? '+' : '-'}{formattedAmount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
