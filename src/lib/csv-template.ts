export interface TransactionSplitInput {
  payer_name: string;
  amount: number;
  is_paid?: boolean;
}

export const TRANSACTION_CSV_COLUMNS = [
  'Data',
  'Descricao',
  'Valor',
  'Tipo',
  'Categoria',
  'Vencimento',
  'Pago',
  'Pagador',
  'Cartao',
  'Rateio',
] as const;

export const TRANSACTION_CSV_SAMPLE_ROWS = [
  ['2026-03-10', 'Supermercado Mensal', '450.50', 'Despesa', 'Alimentação', '2026-03-10', 'Sim', 'Danton', 'Nubank', ''],
  ['2026-03-12', 'Jantar Outback Amigos', '300.00', 'Despesa', 'Alimentação', '2026-03-25', 'Sim', '', 'XP', 'Danton: 100; João: 100; Maria: 100'],
  ['2026-03-15', 'Consultoria / Salário', '3200.00', 'Receita', 'Serviços', '2026-03-15', 'Sim', 'Cliente A', '', ''],
  ['2026-03-20', 'Conta de Energia', '180.20', 'Despesa', 'Moradia', '2026-03-25', 'Não', 'Danton', '', 'Danton: 90.10; Lauren: 90.10'],
  ['2026-03-22', 'Assinatura Streaming', '55.90', 'Despesa', 'Lazer', '2026-03-22', 'Sim', 'Danton', 'XP Visa Infinite', ''],
];

/**
 * Interpreta uma string de rateio no formato:
 * - "Danton: 100; João: 100; Maria: 100"
 * - "Danton=50%; João=50%"
 * - "Danton, João, Maria" (divide o valor total igualmente)
 */
export function parseSplits(raw: string, totalAmount: number): TransactionSplitInput[] {
  if (!raw || !raw.trim()) return [];
  const text = raw.trim();

  let parts: string[] = [];
  if (text.includes(';') || text.includes('|')) {
    parts = text.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
  } else {
    parts = text.split(/,(?=\s*[a-zA-ZÀ-ÿ])/).map((s) => s.trim()).filter(Boolean);
  }

  const results: TransactionSplitInput[] = [];

  for (const part of parts) {
    const match = part.match(/^([^:=]+)[:=]\s*(.+)$/);
    if (match) {
      const name = match[1].trim();
      const valStr = match[2].trim().replace(/[R$\s]/g, '').replace(',', '.');
      if (valStr.endsWith('%')) {
        const pct = parseFloat(valStr.replace('%', ''));
        const amount = parseFloat(((totalAmount * pct) / 100).toFixed(2));
        results.push({ payer_name: name, amount });
      } else {
        const amount = parseFloat(valStr);
        if (!isNaN(amount)) {
          results.push({ payer_name: name, amount });
        }
      }
    } else {
      const name = part.trim();
      if (name) {
        results.push({ payer_name: name, amount: 0 });
      }
    }
  }

  const withAmount = results.filter((r) => r.amount > 0);
  const withoutAmount = results.filter((r) => r.amount === 0);
  if (withoutAmount.length > 0) {
    const allocated = withAmount.reduce((sum, r) => sum + r.amount, 0);
    const remaining = Math.max(0, totalAmount - allocated);
    const splitPerPerson = parseFloat((remaining / withoutAmount.length).toFixed(2));
    withoutAmount.forEach((r, idx) => {
      if (idx === withoutAmount.length - 1) {
        r.amount = parseFloat((remaining - splitPerPerson * (withoutAmount.length - 1)).toFixed(2));
      } else {
        r.amount = splitPerPerson;
      }
    });
  }

  return results;
}

/**
 * Faz o download do arquivo CSV modelo de despesas/transações com UTF-8 BOM
 * para compatibilidade total com Excel, LibreOffice e Google Planilhas.
 */
export function downloadTransactionTemplateCsv(filename = 'modelo_importacao_despesas.csv') {
  const headerLine = TRANSACTION_CSV_COLUMNS.join(',');
  const sampleLines = TRANSACTION_CSV_SAMPLE_ROWS.map((row) =>
    row
      .map((val) => (val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val))
      .join(',')
  ).join('\n');

  const csvContent = `${headerLine}\n${sampleLines}\n`;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
