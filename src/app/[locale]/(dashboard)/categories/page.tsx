import { createClient } from '@/lib/supabase/server'
import { CategoryList } from './category-list'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')

  const { data: categories } = await supabase
    .from('categories')
    .select('*, workspaces(name)')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centros de Custo (Categorias)</h1>
        <p className="text-muted-foreground">
          Gerencie as categorias para organizar e relatar suas transações.
        </p>
      </div>

      <CategoryList
        initialCategories={categories || []}
        workspaces={workspaces || []}
      />
    </div>
  )
}
