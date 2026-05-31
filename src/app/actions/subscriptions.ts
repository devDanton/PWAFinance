'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const workspace_id = formData.get('workspace_id') as string
  const type = formData.get('type') as 'income' | 'expense'
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category_id = formData.get('category_id') as string
  const credit_card_id = formData.get('credit_card_id') as string | null
  const frequency = formData.get('frequency') as string // 'monthly' | 'yearly'
  const next_date = formData.get('next_date') as string

  const { error } = await supabase.from('subscriptions').insert({
    workspace_id,
    created_by: user.id,
    type,
    amount,
    description,
    category_id,
    credit_card_id: credit_card_id && credit_card_id !== 'none' ? credit_card_id : null,
    frequency,
    next_date,
    active: true
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const type = formData.get('type') as 'income' | 'expense'
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category_id = formData.get('category_id') as string
  const credit_card_id = formData.get('credit_card_id') as string | null
  const frequency = formData.get('frequency') as string
  const next_date = formData.get('next_date') as string

  const { error } = await supabase
    .from('subscriptions')
    .update({
      type,
      amount,
      description,
      category_id,
      credit_card_id: credit_card_id && credit_card_id !== 'none' ? credit_card_id : null,
      frequency,
      next_date
    })
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function toggleSubscriptionActive(id: string, active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('subscriptions')
    .update({ active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
