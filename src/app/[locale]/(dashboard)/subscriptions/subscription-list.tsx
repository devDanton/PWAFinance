'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Pencil, Play, Pause } from 'lucide-react'
import { format } from 'date-fns'
import { createSubscription, deleteSubscription, updateSubscription, toggleSubscriptionActive } from '@/app/actions/subscriptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { SubmitButton } from '@/components/ui/submit-button'

export function SubscriptionList({ 
  initialSubscriptions, 
  workspaces, 
  cards,
  categories,
  transactions
}: { 
  initialSubscriptions: any[], 
  workspaces: any[], 
  cards: any[],
  categories: any[],
  transactions: any[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  const [editingSub, setEditingSub] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSubscriptions = initialSubscriptions.filter((sub) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      (sub.description?.toLowerCase() || '').includes(searchLower) ||
      (sub.categories?.name?.toLowerCase() || '').includes(searchLower) ||
      (sub.workspaces?.name?.toLowerCase() || '').includes(searchLower)
    )
  })

  const filteredCards = cards.filter(c => c.workspace_id === selectedWorkspace)
  const filteredCategories = categories.filter(c => c.workspace_id === selectedWorkspace)

  async function handleSave(formData: FormData) {
    if (editingSub) {
      await updateSubscription(editingSub.id, formData)
    } else {
      await createSubscription(formData)
    }
    setOpen(false)
    setEditingSub(null)
  }

  function handleEdit(sub: any) {
    setEditingSub(sub)
    setSelectedWorkspace(sub.workspace_id)
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar esta assinatura? As transações já geradas não serão afetadas.')) {
      await deleteSubscription(id)
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    await toggleSubscriptionActive(id, !currentStatus)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Input 
          placeholder="Buscar assinaturas..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingSub(null); }}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0} onClick={() => setEditingSub(null)}>
              <Plus className="mr-2 h-4 w-4" /> Nova Assinatura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={handleSave} key={editingSub ? editingSub.id : 'new'}>
              <DialogHeader>
                <DialogTitle>{editingSub ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
                <DialogDescription>
                  Configure a recorrência para ser gerada automaticamente.
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
                  <Select name="type" defaultValue={editingSub?.type || "expense"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" defaultValue={editingSub?.amount} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (Ex: Netflix, Spotify)</Label>
                  <Input id="description" name="description" placeholder="Ex: Netflix" defaultValue={editingSub?.description} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category_id">Centro de Custo / Categoria</Label>
                  {filteredCategories.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      Nenhuma categoria cadastrada. Crie uma na tela de categorias primeiro.
                    </div>
                  ) : (
                    <Select name="category_id" defaultValue={editingSub?.category_id || undefined} required>
                      <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
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
                  <Select name="credit_card_id" defaultValue={editingSub?.credit_card_id || "none"}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {filteredCards.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="frequency">Frequência</Label>
                  <Select name="frequency" defaultValue={editingSub?.frequency || "monthly"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="next_date">Próximo Vencimento</Label>
                  <Input id="next_date" name="next_date" type="date" required defaultValue={editingSub?.next_date || format(new Date(), 'yyyy-MM-dd')} />
                </div>
              </div>
              <DialogFooter>
                <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Frequência / Próximo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Ativo?</TableHead>
              <TableHead className="text-right">Valor da Parcela</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                  Nenhuma assinatura encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions.map((sub) => {
                const isIncome = sub.type === 'income'
                const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.amount)
                
                return (
                  <TableRow key={sub.id} className={!sub.active ? 'opacity-60 grayscale' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isIncome ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                        {sub.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="capitalize font-medium">{sub.frequency === 'monthly' ? 'Mensal' : 'Anual'}</span>
                        <span className="text-xs text-muted-foreground">Prox: {format(new Date(sub.next_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.categories ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${sub.categories.color}20`, color: sub.categories.color }}>
                          {sub.categories.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sem categoria</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{sub.workspaces?.name}</div>
                      {sub.credit_cards && <div className="text-xs text-muted-foreground">{sub.credit_cards.name}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={sub.active} 
                          onCheckedChange={() => handleToggleActive(sub.id, sub.active)} 
                        />
                        <span className={`text-xs font-medium ${sub.active ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {sub.active ? 'Sim' : 'Pausado'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isIncome ? 'text-emerald-500' : ''}`}>
                      {isIncome ? '+' : '-'}{formattedAmount}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        transactions
                          .filter(tx => tx.is_paid && tx.type === sub.type && tx.description.toLowerCase().trim() === sub.description.toLowerCase().trim())
                          .reduce((sum, tx) => sum + Number(tx.amount), 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)} className="text-muted-foreground h-8 w-8" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)} className="text-destructive h-8 w-8" title="Deletar">
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
