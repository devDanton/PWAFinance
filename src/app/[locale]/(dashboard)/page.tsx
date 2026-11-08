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

  // Fetch basic metrics sequentially
  const { count: workspacesCount } = await supabase.from('workspaces').select('*', { count: 'exact', head: true });
  const { count: cardsCount } = await supabase.from('credit_cards').select('*', { count: 'exact', head: true });
  const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  const { data: transactions } = await supabase.from('transactions').select('type, amount, date, is_paid, credit_card_id, category_id, workspace_id, description');
  const { data: creditCards } = await supabase.from('credit_cards').select('id, total_limit');
  const { data: workspaces } = await supabase.from('workspaces').select('id, name');
  const { data: categories } = await supabase.from('categories').select('id, name, workspace_id, color');
  const { data: subscriptions } = await supabase.from('subscriptions').select('type, description');

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
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Bem-vindo(a) de volta, {user.user_metadata?.first_name || user.email}! Aqui está o seu resumo financeiro.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" /> Resumo do Mês
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Receitas</span>
              <ArrowUpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
            </div>
            <div className="text-xs sm:text-2xl font-bold text-emerald-500 mt-1 sm:mt-2 truncate">{formatCurrency(monthlyIncome)}</div>
          </Card>
          <Card className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Despesas</span>
              <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 shrink-0" />
            </div>
            <div className="text-xs sm:text-2xl font-bold text-rose-500 mt-1 sm:mt-2 truncate">{formatCurrency(monthlyExpense)}</div>
          </Card>
          <Card className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Saldo</span>
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            </div>
            <div className={`text-xs sm:text-2xl font-bold mt-1 sm:mt-2 truncate ${monthlyBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(monthlyBalance)}
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5" /> Visão Geral
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Receitas Totais</span>
              <ArrowUpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
            </div>
            <div className="text-sm sm:text-xl font-bold text-emerald-500 mt-1 truncate">{formatCurrency(globalIncome)}</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Despesas Totais</span>
              <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 shrink-0" />
            </div>
            <div className="text-sm sm:text-xl font-bold text-rose-500 mt-1 truncate">{formatCurrency(globalExpense)}</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Saldo Total</span>
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            </div>
            <div className={`text-sm sm:text-xl font-bold mt-1 truncate ${globalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(globalBalance)}
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-rose-50/70 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-400 truncate">Total Assinaturas</span>
              <ReceiptText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 shrink-0" />
            </div>
            <div className="text-sm sm:text-xl font-bold text-rose-600 dark:text-rose-500 mt-1 truncate">
              {formatCurrency(totalSpentOnSubscriptions)}
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" /> Atalhos e Limites
        </h2>
        
        {/* Mobile: Card de Limites em cima, e os dois atalhos lado a lado na mesma linha */}
        <div className="space-y-2.5 md:hidden">
          <Link href="/cards" className="block">
            <Card className="p-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" /> Limites de Cartão ({cardsCount || 0})
                </span>
                <span className="text-xs font-bold text-foreground">
                  Total: {formatCurrency(totalLimit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Utilizado</span>
                  <span className="text-sm font-bold text-rose-500 truncate">{formatCurrency(limitUsed)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Disponível</span>
                  <span className="text-sm font-bold text-emerald-500 truncate">{formatCurrency(limitAvailable)}</span>
                </div>
              </div>
            </Card>
          </Link>

          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/transactions" className="block">
              <Card className="p-3 shadow-xs h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground truncate">Transações</span>
                  <ReceiptText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
                <div className="text-xl font-bold mt-1">{txCount || 0}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Total de registros</p>
              </Card>
            </Link>

            <Link href="/workspaces" className="block">
              <Card className="p-3 shadow-xs h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground truncate">Workspaces</span>
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
                <div className="text-xl font-bold mt-1">{workspacesCount || 0}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Ambientes criados</p>
              </Card>
            </Link>
          </div>
        </div>

        {/* Desktop: Grid clássico de 3 colunas */}
        <div className="hidden md:grid gap-4 md:grid-cols-3">
          <Link href="/cards" className="transition-transform hover:scale-[1.02]">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Limites de Cartão ({cardsCount || 0})</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Limite Total:</span>
                  <span className="font-bold text-sm sm:text-base">{formatCurrency(totalLimit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Utilizado:</span>
                  <span className="font-bold text-sm sm:text-base text-rose-500">{formatCurrency(limitUsed)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Disponível:</span>
                  <span className="font-bold text-sm sm:text-base text-emerald-500">{formatCurrency(limitAvailable)}</span>
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
                <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{txCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Total de registros</p>
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
                <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{workspacesCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Ambientes criados</p>
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
