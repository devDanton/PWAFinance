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
import { SubmitButton } from '@/components/ui/submit-button'
import { useCards, useInvalidateData, useWorkspaces } from '@/hooks/use-finance-queries'

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

export function CardList({ initialCards, workspaces: initialWorkspaces }: { initialCards: any[], workspaces: any[] }) {
  const { data: cards = [] } = useCards(initialCards)
  const { data: workspaces = [] } = useWorkspaces(initialWorkspaces)
  const { invalidateCards } = useInvalidateData()

  const [open, setOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<any>(null)

  async function handleSave(formData: FormData) {
    if (editingCard) {
      await updateCard(editingCard.id, formData)
    } else {
      await createCard(formData)
    }
    invalidateCards()
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
      invalidateCards()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingCard(null); }}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0} onClick={() => setEditingCard(null)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[460px]">
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
                <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {cards.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            Nenhum cartão cadastrado.
          </div>
        ) : (
          cards.map((card: any) => {
            const formattedLimit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.total_limit)
            const bgColor = card.color || '#000000'
            const textColor = getContrastColor(bgColor)
            const isDarkText = textColor === '#000000'
            const buttonHoverBg = isDarkText ? 'hover:bg-black/10' : 'hover:bg-white/20'

            return (
              <Card 
                key={card.id} 
                className="relative overflow-hidden transition-all hover:shadow-md rounded-xl p-2.5 sm:p-5 flex flex-col justify-between" 
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                {/* Cabeçalho do Cartão */}
                <div className="flex items-start justify-between gap-1 pb-1 sm:pb-2">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: textColor }} />
                    <span className="font-bold text-xs sm:text-lg truncate">
                      {card.name}
                    </span>
                  </div>
                  <div className="flex items-center shrink-0 -mr-1 -mt-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(card)} 
                      className={`${buttonHoverBg} h-6 w-6 sm:h-8 sm:w-8 p-0`} 
                      style={{ color: textColor }}
                    >
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(card.id)} 
                      className={`${buttonHoverBg} h-6 w-6 sm:h-8 sm:w-8 p-0`} 
                      style={{ color: textColor }}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>

                {/* Métricas de Limite */}
                <div className="space-y-1 sm:space-y-1.5 my-1 sm:my-2">
                  <div className="flex justify-between items-center text-[10px] sm:text-sm" style={{ opacity: 0.9 }}>
                    <span className="truncate">Limite:</span>
                    <span className="font-bold text-xs sm:text-base ml-1 shrink-0">{formattedLimit}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] sm:text-sm">
                    <span className="truncate" style={{ opacity: 0.9 }}>Usado:</span>
                    <span className="font-bold text-[11px] sm:text-sm ml-1 shrink-0">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limit_used || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] sm:text-sm">
                    <span className="truncate" style={{ opacity: 0.9 }}>Disp:</span>
                    <span className="font-bold text-[11px] sm:text-sm ml-1 shrink-0">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limit_available || card.total_limit)}
                    </span>
                  </div>
                </div>

                {/* Rodapé: Workspace e Datas de Fechamento/Vencimento */}
                <div className="pt-1.5 sm:pt-3 border-t border-current/20 flex flex-col gap-0.5 sm:gap-1 text-[9px] sm:text-xs">
                  <p className="truncate" style={{ opacity: 0.85 }}>
                    {card.workspaces?.name}
                  </p>
                  <div className="flex items-center justify-between mt-0.5" style={{ opacity: 0.9 }}>
                    <span>F: {card.closing_day}</span>
                    <span>V: {card.due_day}</span>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
