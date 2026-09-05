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
] as const;

export const TRANSACTION_CSV_SAMPLE_ROWS = [
  ['2026-03-10', 'Supermercado Mensal', '450.50', 'Despesa', 'Alimentação', '2026-03-10', 'Sim', 'Principal', 'Nubank'],
  ['2026-03-15', 'Consultoria / Salário', '3200.00', 'Receita', 'Serviços', '2026-03-15', 'Sim', 'Cliente A', ''],
  ['2026-03-20', 'Conta de Energia', '180.20', 'Despesa', 'Moradia', '2026-03-25', 'Não', 'Principal', ''],
  ['2026-03-22', 'Assinatura Streaming', '55.90', 'Despesa', 'Lazer', '2026-03-22', 'Sim', 'Principal', 'XP Visa Infinite'],
];

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

  // UTF-8 BOM (\uFEFF) garante que caracteres acentuados sejam exibidos corretamente no Excel
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
