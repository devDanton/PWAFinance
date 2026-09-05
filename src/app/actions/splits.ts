'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Alterna o status pago/pendente de um rateio específico em transaction_splits.
 */
export async function toggleSplitPaid(splitId: string, isPaid: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { error } = await supabase
    .from('transaction_splits')
    .update({ is_paid: isPaid })
    .eq('id', splitId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/reimbursements');
  revalidatePath('/transactions');
  return { success: true };
}

/**
 * Marca como pago/pendente todos os rateios e transações diretas de um pagador no mês.
 */
export async function markAllItemsPaid(params: {
  splitIds?: string[];
  directTransactionIds?: string[];
  isPaid: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { splitIds = [], directTransactionIds = [], isPaid } = params;

  if (splitIds.length > 0) {
    const { error: splitError } = await supabase
      .from('transaction_splits')
      .update({ is_paid: isPaid })
      .in('id', splitIds);

    if (splitError) {
      return { error: splitError.message };
    }
  }

  if (directTransactionIds.length > 0) {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ is_paid: isPaid })
      .in('id', directTransactionIds);

    if (txError) {
      return { error: txError.message };
    }
  }

  revalidatePath('/reimbursements');
  revalidatePath('/transactions');
  return { success: true };
}

/**
 * Busca os rateios existentes de uma transação.
 */
export async function getTransactionSplits(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  try {
    const { data, error } = await supabase
      .from('transaction_splits')
      .select('id, payer_id, amount, is_paid, notes, payers(id, name)')
      .eq('transaction_id', transactionId);

    if (error) return { error: error.message };
    return { data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar rateios';
    return { error: msg };
  }
}

/**
 * Salva ou remove os rateios de uma transação existente.
 */
export async function saveTransactionSplits(params: {
  transactionId: string;
  splits: Array<{
    payer_id: string;
    amount: number;
    is_paid?: boolean;
    notes?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { transactionId, splits } = params;

  // 1. Remove rateios antigos da transação
  const { error: deleteError } = await supabase
    .from('transaction_splits')
    .delete()
    .eq('transaction_id', transactionId);

  if (deleteError) {
    return { error: 'Erro ao limpar rateios antigos: ' + deleteError.message };
  }

  // 2. Se novos splits foram informados, insere
  if (splits && splits.length > 0) {
    const records = splits.map((s) => ({
      transaction_id: transactionId,
      payer_id: s.payer_id,
      amount: s.amount,
      is_paid: s.is_paid !== undefined ? s.is_paid : false,
      notes: s.notes || null,
    }));

    const { error: insertError } = await supabase
      .from('transaction_splits')
      .insert(records);

    if (insertError) {
      return { error: 'Erro ao gravar novos rateios: ' + insertError.message };
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/reimbursements');
  revalidatePath('/', 'layout');
  return { success: true };
}
