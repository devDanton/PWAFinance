'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { createCategory, deleteCategory, updateCategory } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function CategoryList({ 
  initialCategories, 
  workspaces 
}: { 
  initialCategories: any[], 
  workspaces: any[] 
}) {
  const [open, setOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id || '')
  const [editingCat, setEditingCat] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCategories = initialCategories.filter((cat) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      cat.name?.toLowerCase().includes(searchLower) ||
      cat.workspaces?.name?.toLowerCase().includes(searchLower)
    )
  })

  async function handleSave(formData: FormData) {
    if (editingCat) {
      await updateCategory(editingCat.id, formData)
    } else {
      await createCategory(formData)
    }
    setOpen(false)
    setEditingCat(null)
  }

  function handleEdit(cat: any) {
    setEditingCat(cat)
    setSelectedWorkspace(cat.workspace_id)
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar esta categoria? Lançamentos que utilizam essa categoria ficarão "Sem categoria".')) {
      await deleteCategory(id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Input 
          placeholder="Buscar categorias..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingCat(null); }}>
          <DialogTrigger asChild>
            <Button disabled={workspaces.length === 0} onClick={() => setEditingCat(null)}>
              <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form action={handleSave} key={editingCat ? editingCat.id : 'new'}>
              <DialogHeader>
                <DialogTitle>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                <DialogDescription>
                  Crie centros de custo para organizar suas receitas e despesas.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                  <Label htmlFor="name">Nome da Categoria</Label>
                  <Input id="name" name="name" placeholder="Ex: Moradia, Transporte..." defaultValue={editingCat?.name} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex items-center gap-2">
                    <Input id="color" name="color" type="color" className="w-16 h-10 p-1 cursor-pointer" defaultValue={editingCat?.color || '#808080'} required />
                    <span className="text-sm text-muted-foreground">Escolha uma cor para identificar na lista.</span>
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

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: cat.color }}></div>
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{cat.workspaces?.name}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="text-muted-foreground h-8 w-8" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive h-8 w-8" title="Deletar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
