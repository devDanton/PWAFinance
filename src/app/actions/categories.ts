'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCategory(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const workspace_id = formData.get('workspace_id') as string
  const name = formData.get('name') as string
  const color = formData.get('color') as string || '#808080'

  const { error } = await supabase
    .from('categories')
    .insert({ workspace_id, name, color })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = formData.get('name') as string
  const color = formData.get('color') as string || '#808080'

  const { error } = await supabase
    .from('categories')
    .update({ name, color })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
