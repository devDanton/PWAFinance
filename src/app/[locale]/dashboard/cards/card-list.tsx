'use client'

import { useState } from 'react'
import { Plus, Trash2, CreditCard, Pencil } from 'lucide-react'
import { createCard, deleteCard, updateCard } from '@/app/actions/cards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function getContrastColor(hexColor: string) {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 2), 16);
  const b = parseInt(hex.substring(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

export function CardList({ initialCards, workspaces }: { initialCards: any[], workspaces: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingCard, setEditingCard] = useState<any>(null)

  async function handleSave(formData: FormData) {
    setLoading(true)
    if (editingCard) {
      await updateCard(editingCard.id, formData)
    } else {
      await createCard(formData)
    }
    setLoading(false)
    setOpen(false)
    setEditingCard(null)
  }

  function handleEdit(card: any) {
    setEditingCard(card)
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar este cartão?')) {
      await deleteCard(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingCard(null); }}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0} onClick={() => setEditingCard(null)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleSave} key={editingCard ? editingCard.id : 'new'}>
              <DialogHeader>
                <DialogTitle>{editingCard ? 'Editar Cartão' : 'Adicionar Cartão'}</DialogTitle>
                <DialogDescription>
                  {editingCard ? 'Atualize os detalhes do seu cartão.' : 'Insira os detalhes do cartão de crédito para acompanhar faturas e limites.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="workspace_id">Workspace</Label>
                  <Select name="workspace_id" defaultValue={editingCard?.workspace_id} required>
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
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome / Apelido</Label>
                    <Input id="name" name="name" placeholder="Ex: Nubank" defaultValue={editingCard?.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">Cor</Label>
                    <Input id="color" name="color" type="color" defaultValue={editingCard?.color || '#000000'} className="h-10 w-14 p-1 cursor-pointer" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="total_limit">Limite Total</Label>
                  <Input id="total_limit" name="total_limit" type="number" step="0.01" placeholder="0.00" defaultValue={editingCard?.total_limit} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="closing_day">Dia de Fechamento</Label>
                    <Input id="closing_day" name="closing_day" type="number" min="1" max="31" defaultValue={editingCard?.closing_day} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_day">Dia de Vencimento</Label>
                    <Input id="due_day" name="due_day" type="number" min="1" max="31" defaultValue={editingCard?.due_day} required />
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
            const bgColor = card.color || '#000000'
            const textColor = getContrastColor(bgColor)
            const isDarkText = textColor === '#000000'
            const buttonHoverBg = isDarkText ? 'hover:bg-black/10' : 'hover:bg-white/20'
            
            return (
              <Card key={card.id} className="relative overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: bgColor, color: textColor }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-12">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5" style={{ color: textColor }} />
                    {card.name}
                  </CardTitle>
                  <div className="absolute top-4 right-4 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(card)} className={`${buttonHoverBg} h-8 w-8`} style={{ color: textColor }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(card.id)} className={`${buttonHoverBg} h-8 w-8`} style={{ color: textColor }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formattedLimit}</div>
                  <p className="text-xs mt-1" style={{ opacity: 0.8 }}>
                    Workspace: {card.workspaces?.name}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm" style={{ opacity: 0.9 }}>
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
