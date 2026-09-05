'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, ArrowRight, Check, Download, FileSpreadsheet, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { importTransactions } from '@/app/actions/transactions'
import { downloadTransactionTemplateCsv } from '@/lib/csv-template'
import { useRouter } from 'next/navigation'

type ImportStep = 'setup' | 'mapping' | 'preview' | 'importing'
type InputMethod = 'file' | 'text'

interface ImportTransactionPreview {
  date: string;
  due_date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string;
  payer_name: string;
  is_paid: boolean;
}

export function ImportCsvModal({
  workspaces,
  cards,
}: {
  workspaces: Array<{ id: string; name: string }>;
  cards: Array<{ id: string; name: string; workspace_id: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('setup');
  
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || '');
  const [cardId, setCardId] = useState('none');
  const [inputMethod, setInputMethod] = useState<InputMethod>('file');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [previewData, setPreviewData] = useState<ImportTransactionPreview[]>([]);
  
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amount: '',
    type: '',
    category: '',
    dueDate: '',
    isPaid: '',
    payer: '',
  })
  
  const router = useRouter()

  function resetState() {
    setStep('setup')
    setFile(null)
    setPastedText('')
    setInputMethod('file')
    setHeaders([])
    setRawData([])
    setPreviewData([])
    setMapping({
      date: '',
      description: '',
      amount: '',
      type: '',
      category: '',
      dueDate: '',
      isPaid: '',
      payer: '',
    })
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) resetState()
  }

  function guessMapping(detectedHeaders: string[]) {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    
    const newMap = {
      date: '',
      description: '',
      amount: '',
      type: '',
      category: '',
      dueDate: '',
      isPaid: '',
      payer: '',
    }
    
    detectedHeaders.forEach(h => {
      const norm = normalize(h)
      if (norm.includes('venc') || norm.includes('due')) newMap.dueDate = h
      else if (norm.includes('data') || norm.includes('date')) newMap.date = h
      else if (norm.includes('desc') || norm.includes('titulo') || norm.includes('title') || norm.includes('historico')) newMap.description = h
      else if (norm.includes('valor') || norm.includes('amount') || norm.includes('preco')) newMap.amount = h
      else if (norm.includes('tipo') || norm.includes('type')) newMap.type = h
      else if (norm.includes('cat')) newMap.category = h
      else if (norm.includes('pago') || norm.includes('paid') || norm.includes('status')) newMap.isPaid = h
      else if (norm.includes('pagad') || norm.includes('payer')) newMap.payer = h
    })
    
    setMapping(newMap)
  }

  function parseDateString(rawDate: string): string {
    const trimmed = String(rawDate || '').trim()
    if (!trimmed) return ''
    const dateParts = trimmed.split(/[-/]/);
    if (dateParts.length === 3) {
      let y, m, d;
      if (dateParts[0].length === 4) {
        y = dateParts[0];
        if (parseInt(dateParts[1], 10) > 12) {
          d = dateParts[1];
          m = dateParts[2];
        } else {
          m = dateParts[1];
          d = dateParts[2];
        }
      } else if (dateParts[2].length === 4) {
        y = dateParts[2];
        if (parseInt(dateParts[1], 10) > 12) {
          m = dateParts[0];
          d = dateParts[1];
        } else {
          d = dateParts[0];
          m = dateParts[1];
        }
      }
      
      if (y && m && d) {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    return trimmed;
  }

  function handleParseData() {
    if (inputMethod === 'file') {
      if (!file) return

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const detectedHeaders = results.meta.fields || Object.keys((results.data[0] as Record<string, string>) || {})
            setHeaders(detectedHeaders)
            setRawData(results.data as Record<string, string>[])
            guessMapping(detectedHeaders)
            setStep('mapping')
          } else {
            alert('O arquivo CSV parece estar vazio ou inválido.')
          }
        },
        error: (error) => {
          alert('Erro ao ler CSV: ' + error.message)
        }
      })
    } else {
      let text = pastedText.trim()
      if (!text) {
        alert('Por favor, cole o texto das transações.')
        return
      }

      // Remove markdown code fences se copiado diretamente do Gemini/ChatGPT (```csv ... ```)
      if (text.startsWith('```')) {
        text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const detectedHeaders = results.meta.fields || Object.keys((results.data[0] as Record<string, string>) || {})
            setHeaders(detectedHeaders)
            setRawData(results.data as Record<string, string>[])
            guessMapping(detectedHeaders)
            setStep('mapping')
          } else {
            alert('O texto informado parece estar vazio ou não pôde ser interpretado.')
          }
        },
        error: (error) => {
          alert('Erro ao interpretar texto: ' + error.message)
        }
      })
    }
  }

  function handlePreview() {
    // Validate mapping
    if (!mapping.date || !mapping.description || !mapping.amount) {
      alert('Por favor, mapeie ao menos Data, Descrição e Valor.')
      return
    }

    const processed = rawData.map(row => {
      // Parse Amount
      let rawAmount = String(row[mapping.amount] || '0')
      rawAmount = rawAmount.replace(/[R$\s]/g, '')
      if (rawAmount.includes(',') && rawAmount.includes('.')) {
        rawAmount = rawAmount.replace(/\./g, '').replace(',', '.')
      } else if (rawAmount.includes(',')) {
        rawAmount = rawAmount.replace(',', '.')
      }
      let amount = parseFloat(rawAmount)

      // Parse Date
      const date = parseDateString(row[mapping.date])

      // Parse Due Date (fallback to date if not provided)
      const dueDate = mapping.dueDate && row[mapping.dueDate]
        ? parseDateString(row[mapping.dueDate])
        : date

      // Parse Type
      let type: 'income' | 'expense' = 'expense'
      if (mapping.type && row[mapping.type]) {
        const t = String(row[mapping.type]).toLowerCase()
        if (t.includes('rec') || t.includes('in') || t.includes('+')) type = 'income'
      } else {
        if (amount > 0) type = 'income'
        else type = 'expense'
      }
      
      amount = Math.abs(amount) // Ensure positive, type handles income/expense

      // Parse isPaid
      let isPaid = true // default to true unless specified
      if (mapping.isPaid && row[mapping.isPaid]) {
        const p = String(row[mapping.isPaid]).toLowerCase().trim()
        if (p.includes('nao') || p.includes('não') || p.includes('false') || p === '0' || p.includes('pend')) isPaid = false
      }

      return {
        date,
        due_date: dueDate || date,
        description: String(row[mapping.description] || '').trim(),
        amount,
        type,
        category_name: mapping.category && mapping.category !== 'none' ? String(row[mapping.category] || '').trim() : '',
        payer_name: mapping.payer && mapping.payer !== 'none' ? String(row[mapping.payer] || '').trim() : '',
        is_paid: isPaid
      }
    }).filter(t => !isNaN(t.amount) && t.description && t.date)

    setPreviewData(processed)
    setStep('preview')
  }

  async function handleImport() {
    setStep('importing')
    
    const payload = {
      workspace_id: workspaceId,
      credit_card_id: cardId === 'none' ? null : cardId,
      transactions: previewData
    }

    const res = await importTransactions(payload)
    if (res?.error) {
      alert('Erro na importação: ' + res.error)
      setStep('preview')
    } else {
      setOpen(false)
      resetState()
      router.refresh()
    }
  }

  const isSetupReady = Boolean(workspaceId && (inputMethod === 'file' ? file : pastedText.trim()))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={workspaces.length === 0}>
          <Upload className="mr-2 h-4 w-4" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        
        {step === 'setup' && (
          <>
            <DialogHeader>
              <DialogTitle>Importar Transações</DialogTitle>
              <DialogDescription>
                Envie um arquivo CSV ou cole diretamente o texto formatado gerado pela IA / Gemini.
              </DialogDescription>
            </DialogHeader>

            {/* Callout para download da planilha modelo */}
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold">Precisa da planilha modelo?</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Baixe o modelo com todos os campos suportados (Data, Descrição, Valor, Tipo, Categoria, Vencimento, Pago e Pagador).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs font-semibold gap-1.5 border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                onClick={() => downloadTransactionTemplateCsv()}
              >
                <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Baixar Modelo CSV
              </Button>
            </div>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Workspace de Destino</Label>
                  <Select value={workspaceId} onValueChange={setWorkspaceId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Vincular a um Cartão (Opcional)</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum cartão</SelectItem>
                      {cards.filter(c => c.workspace_id === workspaceId).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seletor de Método de Entrada: Arquivo ou Colar Texto */}
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between">
                  <Label>Forma de Entrada</Label>
                  <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md border border-border">
                    <button
                      type="button"
                      onClick={() => setInputMethod('file')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                        inputMethod === 'file'
                          ? 'bg-background text-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Upload className="h-3 w-3" /> Arquivo CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMethod('text')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                        inputMethod === 'text'
                          ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ClipboardPaste className="h-3 w-3" /> Colar Texto (Gemini / IA)
                    </button>
                  </div>
                </div>

                {inputMethod === 'file' ? (
                  <div className="grid gap-1.5 pt-1">
                    <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <p className="text-[11px] text-muted-foreground">Selecione o arquivo .csv do seu computador.</p>
                  </div>
                ) : (
                  <div className="grid gap-1.5 pt-1">
                    <textarea
                      id="pasted-csv-text"
                      className="w-full min-h-[140px] p-3 rounded-md border border-input bg-background font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60 leading-relaxed"
                      placeholder={`Cole aqui o texto fornecido pelo Gemini ou copiado do Excel. Exemplo:\n\ndate;description;amount;type;category;due_date;is_paid;payer\n05/09/2026;Conserto pneu traseiro direito;40;Despesa;Transporte;05/09/2026;Sim;Danton`}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Dica: você pode colar diretamente com ponto e vírgula (;) ou vírgula (,), com ou sem blocos de código markdown do Gemini.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => downloadTransactionTemplateCsv()}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar Modelo CSV
              </Button>
              <Button disabled={!isSetupReady} onClick={handleParseData}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'mapping' && (
          <>
            <DialogHeader>
              <DialogTitle>Mapear Colunas</DialogTitle>
              <DialogDescription>
                Indique qual coluna representa cada informação. Os campos com asterisco (*) são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-rose-500 font-bold">Data da Transação *</Label>
                  <Select value={mapping.date} onValueChange={v => setMapping({...mapping, date: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-rose-500 font-bold">Descrição *</Label>
                  <Select value={mapping.description} onValueChange={v => setMapping({...mapping, description: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-rose-500 font-bold">Valor *</Label>
                  <Select value={mapping.amount} onValueChange={v => setMapping({...mapping, amount: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo (Receita/Despesa)</Label>
                  <Select value={mapping.type} onValueChange={v => setMapping({...mapping, type: v === 'none' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Auto-detectar pelo valor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Auto-detectar pelo valor (+ ou -)</SelectItem>
                      {headers.map(h => <SelectItem key={'t_'+h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria (Opcional)</Label>
                  <Select value={mapping.category} onValueChange={v => setMapping({...mapping, category: v === 'none' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma / Ficar sem categoria</SelectItem>
                      {headers.map(h => <SelectItem key={'c_'+h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vencimento (Opcional)</Label>
                  <Select value={mapping.dueDate} onValueChange={v => setMapping({...mapping, dueDate: v === 'none' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Mesma da data da transação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Mesma da data da transação</SelectItem>
                      {headers.map(h => <SelectItem key={'d_'+h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status / Pago (Opcional)</Label>
                  <Select value={mapping.isPaid} onValueChange={v => setMapping({...mapping, isPaid: v === 'none' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Padrão: Pago (Sim)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Padrão: Pago (Sim)</SelectItem>
                      {headers.map(h => <SelectItem key={'p_'+h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pagador / Responsável (Opcional)</Label>
                  <Select value={mapping.payer} onValueChange={v => setMapping({...mapping, payer: v === 'none' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {headers.map(h => <SelectItem key={'py_'+h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('setup')}>Voltar</Button>
              <Button onClick={handlePreview} disabled={!mapping.date || !mapping.description || !mapping.amount}>
                Gerar Resumo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>Resumo da Importação</DialogTitle>
              <DialogDescription>
                {previewData.length} transações foram processadas com sucesso. Verifique os dados abaixo antes de salvar. Categorias e pagadores novos serão criados automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((tx, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{tx.description}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {tx.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </TableCell>
                      <TableCell>{tx.category_name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{tx.due_date || tx.date}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.is_paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                          {tx.is_paid ? 'Pago' : 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{tx.payer_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 10 && (
                <p className="text-sm text-center text-muted-foreground mt-2">
                  E mais {previewData.length - 10} transações...
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
              <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="mr-2 h-4 w-4" /> Confirmar e Salvar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'importing' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            <p className="text-lg font-medium">Salvando transações...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
