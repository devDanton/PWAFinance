'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('workspaces')
    .insert({ name, owner_id: user.id })

  if (error) return { error: error.message }
  
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteWorkspace(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/', 'layout')
  return { success: true }
}
