import { createClient } from '@/lib/supabase/server'
import { WorkspaceList } from './workspace-list'

export default async function WorkspacesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch workspaces the user owns or is a member of
  // Due to RLS, simply selecting from workspaces will return only the allowed ones
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground">
          Gerencie suas áreas de trabalho e convide membros.
        </p>
      </div>

      <WorkspaceList initialWorkspaces={workspaces || []} currentUserId={user?.id || ''} />
    </div>
  )
}
