'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Extract form data
  const workspace_id = formData.get('workspace_id') as string
  const type = formData.get('type') as 'income' | 'expense'
  const amount = parseFloat(formData.get('amount') as string)
  const date = formData.get('date') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  
  const credit_card_id = formData.get('credit_card_id') as string | null
  const installments = parseInt(formData.get('installments') as string, 10) || 1
  const is_paid = formData.get('is_paid') === 'true'

  const data = {
    workspace_id,
    created_by: user.id,
    type,
    amount,
    date,
    description,
    category,
    credit_card_id: credit_card_id ? credit_card_id : null,
    installments,
    is_paid,
  }

  const { error } = await supabase.from('transactions').insert(data)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/transactions')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/transactions')
  return { success: true }
}

export async function toggleTransactionPaid(id: string, is_paid: boolean) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('transactions')
    .update({ is_paid })
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/transactions')
  return { success: true }
}
