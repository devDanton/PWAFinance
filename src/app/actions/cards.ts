'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCard(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const data = {
    workspace_id: formData.get('workspace_id') as string,
    owner_id: user.id,
    name: formData.get('name') as string,
    total_limit: parseFloat(formData.get('total_limit') as string),
    closing_day: parseInt(formData.get('closing_day') as string, 10),
    due_day: parseInt(formData.get('due_day') as string, 10),
    color: formData.get('color') as string || '#000000',
  }

  const { error } = await supabase.from('credit_cards').insert(data)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/cards')
  return { success: true }
}

export async function deleteCard(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('credit_cards')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/cards')
  return { success: true }
}

export async function updateCard(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const data = {
    workspace_id: formData.get('workspace_id') as string,
    name: formData.get('name') as string,
    total_limit: parseFloat(formData.get('total_limit') as string),
    closing_day: parseInt(formData.get('closing_day') as string, 10),
    due_day: parseInt(formData.get('due_day') as string, 10),
    color: formData.get('color') as string || '#000000',
  }

  const { error } = await supabase
    .from('credit_cards')
    .update(data)
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/cards')
  return { success: true }
}
