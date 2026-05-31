'use client'

import { useState } from 'react'
import { Trash2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { bulkDeleteTransactions, bulkUpdateTransactions } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'

export function BulkActionsBar({ 
  selectedIds, 
  clearSelection,
  workspaces,
  cards,
  categories
}: { 
  selectedIds: string[], 
  clearSelection: () => void,
  workspaces: any[],
  cards: any[],
  categories: any[]
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit states
  const [editFields, setEditFields] = useState({
    workspace_id: false,
    category_id: false,
    credit_card_id: false,
    is_paid: false
  })

  const [formData, setFormData] = useState({
    workspace_id: workspaces[0]?.id || '',
    category_id: 'none',
    credit_card_id: 'none',
    is_paid: true
  })

  if (selectedIds.length === 0) return null

  async function handleDelete() {
    setLoading(true)
    const res = await bulkDeleteTransactions(selectedIds)
    setLoading(false)
    if (res?.error) {
      alert('Erro ao excluir: ' + res.error)
    } else {
      setIsDeleting(false)
      clearSelection()
      router.refresh()
    }
  }

  async function handleEdit() {
    setLoading(true)
    const payload: any = {}
    
    if (editFields.workspace_id) payload.workspace_id = formData.workspace_id
    if (editFields.category_id) payload.category_id = formData.category_id === 'none' ? null : formData.category_id
    if (editFields.credit_card_id) payload.credit_card_id = formData.credit_card_id === 'none' ? null : formData.credit_card_id
    if (editFields.is_paid) payload.is_paid = formData.is_paid

    const res = await bulkUpdateTransactions(selectedIds, payload)
    setLoading(false)
    if (res?.error) {
      alert('Erro ao editar: ' + res.error)
    } else {
      setIsEditing(false)
      clearSelection()
      router.refresh()
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10">
        <span className="text-sm font-medium">
          {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
        </span>
        <div className="h-6 w-px bg-border mx-2" />
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setIsDeleting(true)}>
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </Button>
        <div className="h-6 w-px bg-border mx-2" />
        <Button size="icon" variant="ghost" onClick={clearSelection} className="rounded-full h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Bulk Delete Modal */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-600">Atenção: Exclusão em Lote</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir <strong>{selectedIds.length}</strong> transações permanentemente.
              Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleting(false)} disabled={loading}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edição em Lote</DialogTitle>
            <DialogDescription>
              Selecione os campos que deseja alterar para as {selectedIds.length} transações selecionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            
            {/* Workspace */}
            <div className="flex items-start space-x-4 border rounded-lg p-4">
              <Checkbox 
                id="edit_workspace" 
                checked={editFields.workspace_id} 
                onCheckedChange={c => setEditFields({...editFields, workspace_id: !!c})}
                className="mt-1"
              />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="edit_workspace" className="cursor-pointer font-semibold">Alterar Workspace</Label>
                {editFields.workspace_id && (
                  <Select value={formData.workspace_id} onValueChange={v => setFormData({...formData, workspace_id: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="flex items-start space-x-4 border rounded-lg p-4">
              <Checkbox 
                id="edit_category" 
                checked={editFields.category_id} 
                onCheckedChange={c => setEditFields({...editFields, category_id: !!c})}
                className="mt-1"
              />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="edit_category" className="cursor-pointer font-semibold">Alterar Categoria</Label>
                {editFields.category_id && (
                  <Select value={formData.category_id} onValueChange={v => setFormData({...formData, category_id: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (Remover categoria)</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Credit Card */}
            <div className="flex items-start space-x-4 border rounded-lg p-4">
              <Checkbox 
                id="edit_card" 
                checked={editFields.credit_card_id} 
                onCheckedChange={c => setEditFields({...editFields, credit_card_id: !!c})}
                className="mt-1"
              />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="edit_card" className="cursor-pointer font-semibold">Alterar Cartão de Crédito</Label>
                {editFields.credit_card_id && (
                  <Select value={formData.credit_card_id} onValueChange={v => setFormData({...formData, credit_card_id: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Transação à vista/débito)</SelectItem>
                      {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Status Pago */}
            <div className="flex items-start space-x-4 border rounded-lg p-4">
              <Checkbox 
                id="edit_paid" 
                checked={editFields.is_paid} 
                onCheckedChange={c => setEditFields({...editFields, is_paid: !!c})}
                className="mt-1"
              />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="edit_paid" className="cursor-pointer font-semibold">Alterar Status de Pagamento</Label>
                {editFields.is_paid && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch checked={formData.is_paid} onCheckedChange={c => setFormData({...formData, is_paid: c})} />
                    <span>{formData.is_paid ? 'Marcar como Pago' : 'Marcar como Pendente'}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>Cancelar</Button>
            <Button 
              onClick={handleEdit} 
              disabled={loading || !Object.values(editFields).some(v => v)}
            >
              {loading ? 'Salvando...' : 'Aplicar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
