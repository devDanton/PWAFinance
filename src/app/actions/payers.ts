'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPayer(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const workspace_id = formData.get('workspace_id') as string

  if (!name || !workspace_id) return { error: 'Nome e workspace são obrigatórios.' }

  const { error } = await supabase
    .from('payers')
    .insert({
      name,
      workspace_id
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pt/payers')
  revalidatePath('/en/payers')
  revalidatePath('/pt/transactions')
  revalidatePath('/en/transactions')
  return { success: true }
}

export async function updatePayer(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string

  if (!name) return { error: 'Nome é obrigatório.' }

  const { error } = await supabase
    .from('payers')
    .update({ name })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pt/payers')
  revalidatePath('/en/payers')
  revalidatePath('/pt/transactions')
  revalidatePath('/en/transactions')
  return { success: true }
}

export async function deletePayer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('payers')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pt/payers')
  revalidatePath('/en/payers')
  revalidatePath('/pt/transactions')
  revalidatePath('/en/transactions')
  return { success: true }
}
