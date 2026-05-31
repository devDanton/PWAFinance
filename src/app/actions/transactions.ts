'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { addMonths } from 'date-fns'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const workspace_id = formData.get('workspace_id') as string
  const type = formData.get('type') as 'income' | 'expense'
  const totalAmount = parseFloat(formData.get('amount') as string)
  const purchaseDateStr = formData.get('date') as string
  const baseDescription = formData.get('description') as string
  const category_id = formData.get('category_id') as string | null
  const credit_card_id = formData.get('credit_card_id') as string | null
  const installments = parseInt(formData.get('installments') as string, 10) || 1
  const is_paid = formData.get('is_paid') === 'true' || formData.get('is_paid') === 'on'
  const manualDueDate = formData.get('due_date') as string | null

  // Fetch credit card if any
  let card = null;
  if (credit_card_id && credit_card_id !== 'none') {
    const { data: cardData } = await supabase.from('credit_cards').select('*').eq('id', credit_card_id).single()
    card = cardData
  }

  const purchaseDate = new Date(purchaseDateStr + 'T12:00:00Z') // prevent timezone shift
  const amountPerInstallment = parseFloat((totalAmount / installments).toFixed(2))

  const transactionsToInsert = []

  for (let i = 1; i <= installments; i++) {
    const isLast = i === installments
    // Fix rounding errors on last installment
    const currentAmount = isLast ? totalAmount - (amountPerInstallment * (installments - 1)) : amountPerInstallment
    const description = installments > 1 ? `${baseDescription} (${i}/${installments})` : baseDescription

    let dueDate = new Date(purchaseDateStr + 'T12:00:00Z')

    if (manualDueDate) {
      dueDate = new Date(manualDueDate + 'T12:00:00Z')
      dueDate = addMonths(dueDate, i - 1)
    } else if (card) {
      let monthOffset = 0
      const pDay = purchaseDate.getUTCDate()
      if (pDay > card.closing_day) {
        monthOffset += 1
      }
      if (card.due_day < card.closing_day) {
        monthOffset += 1
      }
      
      // Add standard month offset + installment offset
      dueDate = new Date(Date.UTC(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth() + monthOffset + (i - 1), card.due_day))
    } else {
      // Cash/debit transaction
      dueDate = addMonths(dueDate, i - 1)
    }

    transactionsToInsert.push({
      workspace_id,
      created_by: user.id,
      type,
      amount: currentAmount,
      date: purchaseDateStr,
      due_date: dueDate.toISOString().split('T')[0],
      description,
      category_id,
      credit_card_id: card ? card.id : null,
      installments: 1, // Store as 1 since it's already divided, but we keep original metadata if needed? Wait, schema has 'installments', we can keep original or 1. Let's store original.
      is_paid,
    })
  }

  const { error } = await supabase.from('transactions').insert(transactionsToInsert)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteTransaction(id: string, deleteAll: boolean = false) {
  const supabase = await createClient()

  if (deleteAll) {
    const { data: tx, error: fetchError } = await supabase
      .from('transactions')
      .select('created_at, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !tx) return { error: fetchError?.message || 'Transaction not found' }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('created_at', tx.created_at)
      .eq('created_by', tx.created_by)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }
  }

  revalidatePath('/transactions')
  return { success: true }
}

export async function toggleTransactionPaid(id: string, is_paid: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .update({ is_paid })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const workspace_id = formData.get('workspace_id') as string
  const type = formData.get('type') as 'income' | 'expense'
  const amount = parseFloat(formData.get('amount') as string)
  const date = formData.get('date') as string
  const description = formData.get('description') as string
  const category_id = formData.get('category_id') as string | null
  const credit_card_id = formData.get('credit_card_id') as string | null
  const installments = parseInt(formData.get('installments') as string, 10) || 1
  const is_paid = formData.get('is_paid') === 'true' || formData.get('is_paid') === 'on'
  const due_date = formData.get('due_date') as string | null

  const data = {
    workspace_id,
    type,
    amount,
    date,
    due_date: due_date ? due_date : date,
    description,
    category_id,
    credit_card_id: credit_card_id && credit_card_id !== 'none' ? credit_card_id : null,
    installments,
    is_paid,
  }

  const { error } = await supabase
    .from('transactions')
    .update(data)
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function importTransactions(payload: {
  workspace_id: string;
  credit_card_id?: string | null;
  transactions: {
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category_name?: string;
    is_paid?: boolean;
  }[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { workspace_id, credit_card_id, transactions } = payload;
  
  if (!transactions || transactions.length === 0) return { error: 'Nenhuma transação para importar' };

  // Get unique category names to check/create
  const uniqueCategoryNames = Array.from(new Set(
    transactions.map(t => t.category_name?.trim()).filter(Boolean)
  )) as string[];

  const categoryMap: Record<string, string> = {};

  if (uniqueCategoryNames.length > 0) {
    // Fetch existing categories in workspace
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('workspace_id', workspace_id);

    const existingNames = new Set((existingCategories || []).map(c => c.name.toLowerCase()));
    
    // Determine which ones are missing
    const missingNames = uniqueCategoryNames.filter(name => !existingNames.has(name.toLowerCase()));

    // Create missing categories
    if (missingNames.length > 0) {
      const newCategories = missingNames.map(name => ({
        workspace_id,
        name,
        color: '#808080' // default color
      }));

      const { data: insertedCategories, error: insertCatError } = await supabase
        .from('categories')
        .insert(newCategories)
        .select('id, name');

      if (insertCatError) {
        return { error: 'Erro ao criar categorias automáticas: ' + insertCatError.message };
      }
      
      const allCats = [...(existingCategories || []), ...(insertedCategories || [])];
      allCats.forEach(c => {
        categoryMap[c.name.toLowerCase()] = c.id;
      });
    } else {
      (existingCategories || []).forEach(c => {
        categoryMap[c.name.toLowerCase()] = c.id;
      });
    }
  }

  // Format transactions for insertion
  const transactionsToInsert = transactions.map(t => {
    let category_id = null;
    if (t.category_name) {
      category_id = categoryMap[t.category_name.trim().toLowerCase()] || null;
    }

    return {
      workspace_id,
      created_by: user.id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      due_date: t.date,
      description: t.description,
      category_id,
      credit_card_id: credit_card_id || null,
      installments: 1,
      is_paid: t.is_paid !== undefined ? t.is_paid : true,
    };
  });

  const { error } = await supabase.from('transactions').insert(transactionsToInsert);

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: true, count: transactionsToInsert.length };
}
