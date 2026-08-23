import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspaces } = await supabase.from('workspaces').select('id, name')
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, workspaces(name), credit_cards(name), categories(name)')

  return NextResponse.json({
    user: user?.id,
    workspaces,
    transactions,
    error
  })
}
