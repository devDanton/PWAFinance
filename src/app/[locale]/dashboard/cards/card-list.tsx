'use client'

import { useState } from 'react'
import { Plus, Trash2, CreditCard } from 'lucide-react'
import { createCard, deleteCard } from '@/app/actions/cards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function CardList({ initialCards, workspaces }: { initialCards: any[], workspaces: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate(formData: FormData) {
    setLoading(true)
    await createCard(formData)
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar este cartão?')) {
      await deleteCard(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Adicionar Cartão</DialogTitle>
                <DialogDescription>
                  Insira os detalhes do cartão de crédito para acompanhar faturas e limites.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="workspace_id">Workspace</Label>
                  <Select name="workspace_id" required>
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
                  <Label htmlFor="name">Nome / Apelido</Label>
                  <Input id="name" name="name" placeholder="Ex: Nubank" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="total_limit">Limite Total</Label>
                  <Input id="total_limit" name="total_limit" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="closing_day">Dia de Fechamento</Label>
                    <Input id="closing_day" name="closing_day" type="number" min="1" max="31" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_day">Dia de Vencimento</Label>
                    <Input id="due_day" name="due_day" type="number" min="1" max="31" required />
                  </div>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialCards.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            Nenhum cartão cadastrado.
          </div>
        ) : (
          initialCards.map((card) => {
            const formattedLimit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.total_limit)
            
            return (
              <Card key={card.id} className="relative overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {card.name}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(card.id)} className="text-destructive h-8 w-8 absolute top-4 right-4">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formattedLimit}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Workspace: {card.workspaces?.name}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div>Fechamento: Dia {card.closing_day}</div>
                    <div>Vencimento: Dia {card.due_day}</div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
