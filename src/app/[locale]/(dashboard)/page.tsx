import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptText, CreditCard, Users } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/pt/login');
  }

  // Fetch basic metrics
  const { count: workspacesCount } = await supabase.from('workspaces').select('*', { count: 'exact', head: true });
  const { count: cardsCount } = await supabase.from('credit_cards').select('*', { count: 'exact', head: true });
  const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo(a) de volta, {user.user_metadata?.first_name || user.email}! Aqui está o seu resumo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/workspaces" className="transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workspaces Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workspacesCount || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cards" className="transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cartões de Crédito</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cardsCount || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/transactions" className="transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transações Lançadas</CardTitle>
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{txCount || 0}</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
