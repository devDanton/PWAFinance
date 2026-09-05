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
