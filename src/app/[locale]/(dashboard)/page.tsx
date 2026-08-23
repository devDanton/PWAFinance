import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptText, CreditCard, Users, ArrowUpCircle, ArrowDownCircle, Wallet, Calendar } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/pt/login');
  }

  // Fetch basic metrics
  const [
    { count: workspacesCount },
    { count: cardsCount },
    { count: txCount },
    { data: transactions },
    { data: creditCards },
    { data: workspaces },
    { data: categories },
    { data: subscriptions }
  ] = await Promise.all([
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase.from('credit_cards').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('type, amount, date, is_paid, credit_card_id, category_id, workspace_id, description'),
    supabase.from('credit_cards').select('id, total_limit'),
    supabase.from('workspaces').select('id, name'),
    supabase.from('categories').select('id, name, workspace_id, color'),
    supabase.from('subscriptions').select('type, description')
  ]);

  const txs = transactions || [];
  const cards = creditCards || [];
  const wsList = workspaces || [];
  const catList = categories || [];
  const subsList = subscriptions || [];

  // Data processing
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const monthlyTxs = txs.filter(tx => tx.date.startsWith(currentMonth));

  // Global Totals
  const globalIncome = txs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const globalExpense = txs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const globalBalance = globalIncome - globalExpense;

  // Monthly Totals
  const monthlyIncome = monthlyTxs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const monthlyExpense = monthlyTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const monthlyBalance = monthlyIncome - monthlyExpense;

  // Credit Card Totals
  const totalLimit = cards.reduce((acc, card) => acc + Number(card.total_limit), 0);
  const limitUsed = txs.filter(tx => tx.credit_card_id && !tx.is_paid).reduce((acc, tx) => acc + Number(tx.amount), 0);
  const limitAvailable = totalLimit - limitUsed;

  // Subscriptions Total Spent
  const totalSpentOnSubscriptions = subsList.reduce((acc, sub) => {
    if (sub.type === 'income') return acc;
    const spentForThis = txs
      .filter(tx => tx.is_paid && tx.type === 'expense' && tx.description.toLowerCase().trim() === sub.description.toLowerCase().trim())
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    return acc + spentForThis;
  }, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo(a) de volta, {user.user_metadata?.first_name || user.email}! Aqui está o seu resumo financeiro.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Resumo do Mês
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{formatCurrency(monthlyIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">{formatCurrency(monthlyExpense)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo (Mês)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(monthlyBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Visão Geral
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas Totais</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{formatCurrency(globalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">{formatCurrency(globalExpense)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${globalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(globalBalance)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-400">Total em Assinaturas</CardTitle>
              <ReceiptText className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-500">
                {formatCurrency(totalSpentOnSubscriptions)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Atalhos e Limites
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/cards" className="transition-transform hover:scale-[1.02]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Limites de Cartão ({cardsCount || 0})</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Limite Total:</span>
                  <span className="font-bold">{formatCurrency(totalLimit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Utilizado:</span>
                  <span className="font-bold text-rose-500">{formatCurrency(limitUsed)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Disponível:</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(limitAvailable)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/transactions" className="transition-transform hover:scale-[1.02]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transações Lançadas</CardTitle>
                <ReceiptText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mt-2">{txCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de registros</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/workspaces" className="transition-transform hover:scale-[1.02]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workspaces Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mt-2">{workspacesCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Ambientes criados</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> Gastos por Centro de Custo (Workspace)
        </h2>
        {wsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {wsList.map((ws) => {
              // Transactions for this workspace
              const wsCategories = catList.filter(c => c.workspace_id === ws.id);

              // To get total expenses for this workspace, we need tx.workspace_id 
              // Wait, in page.tsx we only selected 'type, amount, date, is_paid, credit_card_id', we need 'category_id, workspace_id' too!
              // I will update the top select to include 'category_id, workspace_id'.
              const wsExpenses = txs.filter(tx => tx.workspace_id === ws.id && tx.type === 'expense');
              const wsTotal = wsExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0);

              return (
                <Card key={ws.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 pb-4">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{ws.name}</span>
                      <span className="text-rose-500 font-bold">{formatCurrency(wsTotal)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {wsCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">Sem categorias cadastradas.</p>
                    ) : (
                      <div className="divide-y">
                        {wsCategories.map(cat => {
                          const catExpenses = wsExpenses.filter(tx => tx.category_id === cat.id);
                          const catTotal = catExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0);

                          if (catTotal === 0) return null; // Hide empty categories

                          return (
                            <div key={cat.id} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm font-medium">{cat.name}</span>
                              </div>
                              <span className="text-sm font-semibold">{formatCurrency(catTotal)}</span>
                            </div>
                          );
                        })}
                        {wsCategories.every(cat => wsExpenses.filter(tx => tx.category_id === cat.id).reduce((sum, tx) => sum + Number(tx.amount), 0) === 0) && (
                          <p className="text-sm text-muted-foreground p-4">Nenhum gasto registrado nas categorias deste workspace.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
