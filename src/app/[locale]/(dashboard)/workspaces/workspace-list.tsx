'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createWorkspace, deleteWorkspace } from '@/app/actions/workspaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useWorkspaces, useInvalidateData } from '@/hooks/use-finance-queries'

export function WorkspaceList({ initialWorkspaces, currentUserId }: { initialWorkspaces: any[], currentUserId: string }) {
  const { data: workspaces = [] } = useWorkspaces(initialWorkspaces)
  const { invalidateWorkspaces } = useInvalidateData()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate(formData: FormData) {
    setLoading(true)
    await createWorkspace(formData)
    invalidateWorkspaces()
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar este workspace?')) {
      await deleteWorkspace(id)
      invalidateWorkspaces()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo Workspace</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[425px]">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Criar Workspace</DialogTitle>
                <DialogDescription>
                  Adicione uma nova área de trabalho para gerenciar as finanças em conjunto.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Workspace</Label>
                  <Input id="name" name="name" placeholder="Ex: Casa" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visão Mobile: Cards compactos */}
      <div className="block md:hidden space-y-2.5">
        {(workspaces || []).length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum workspace encontrado. Crie um para começar.
          </div>
        ) : (
          (workspaces || []).map((workspace: any) => (
            <div key={workspace.id} className="rounded-xl border bg-card p-3.5 shadow-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">Criado em {new Date(workspace.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              {workspace.owner_id === currentUserId && (
                <Button variant="ghost" size="icon" onClick={() => handleDelete(workspace.id)} className="text-destructive h-9 w-9 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Visão Desktop: Tabela clássica */}
      <div className="hidden md:block rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(workspaces || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                  Nenhum workspace encontrado. Crie um para começar.
                </TableCell>
              </TableRow>
            ) : (
              (workspaces || []).map((workspace: any) => (
                <TableRow key={workspace.id}>
                  <TableCell className="font-medium">{workspace.name}</TableCell>
                  <TableCell>{new Date(workspace.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    {workspace.owner_id === currentUserId && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(workspace.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
