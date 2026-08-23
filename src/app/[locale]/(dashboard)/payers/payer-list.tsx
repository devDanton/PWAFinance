'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { createPayer, deletePayer, updatePayer } from '@/app/actions/payers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function PayerList({ 
  initialPayers, 
  workspaces 
}: { 
  initialPayers: any[], 
  workspaces: any[] 
}) {
  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces.length > 0 ? workspaces[0].id : 'all')
  const [editingPayer, setEditingPayer] = useState<any>(null)
  
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPayers = initialPayers.filter((p) => {
    if (selectedWorkspace && selectedWorkspace !== 'all' && p.workspace_id !== selectedWorkspace) return false
    if (searchTerm) {
      if (!p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    }
    return true
  })

  async function handleSave(formData: FormData) {
    if (editingPayer) {
      await updatePayer(editingPayer.id, formData)
    } else {
      await createPayer(formData)
    }
    setOpen(false)
    setEditingPayer(null)
  }

  function handleEdit(payer: any) {
    setEditingPayer(payer)
    setSelectedWorkspace(payer.workspace_id)
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar este pagador? O vínculo com as transações será removido.')) {
      await deletePayer(id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input 
            placeholder="Buscar pagadores..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Workspaces</SelectItem>
              {workspaces.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingPayer(null); }}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0} onClick={() => setEditingPayer(null)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Pagador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingPayer ? 'Editar Pagador' : 'Novo Pagador'}</DialogTitle>
                <DialogDescription>
                  {editingPayer ? 'Altere o nome da pessoa.' : 'Adicione uma nova pessoa para rastrear despesas de terceiros.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="workspace_id">Workspace</Label>
                  <Select name="workspace_id" value={selectedWorkspace} onValueChange={setSelectedWorkspace} disabled={!!editingPayer} required>
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
                  <Label htmlFor="name">Nome da Pessoa</Label>
                  <Input id="name" name="name" placeholder="Ex: João, Namorada, etc." defaultValue={editingPayer?.name} required />
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
              <TableHead>Nome</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                  Nenhum pagador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayers.map((p) => {
                const ws = workspaces.find(w => w.id === p.workspace_id)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                    </TableCell>
                    <TableCell>
                      {ws?.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="text-muted-foreground h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive h-8 w-8">
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
