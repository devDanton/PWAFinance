'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { importTransactions } from '@/app/actions/transactions'
import { useRouter } from 'next/navigation'

type ImportStep = 'setup' | 'mapping' | 'preview' | 'importing'

export function ImportCsvModal({ workspaces, cards }: { workspaces: any[], cards: any[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<ImportStep>('setup')
  
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || '')
  const [cardId, setCardId] = useState('none')
  const [file, setFile] = useState<File | null>(null)
  
  const [headers, setHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amount: '',
    type: '',
    category: '',
    isPaid: ''
  })
  
  const router = useRouter()

  function resetState() {
    setStep('setup')
    setFile(null)
    setHeaders([])
    setRawData([])
    setPreviewData([])
    setMapping({ date: '', description: '', amount: '', type: '', category: '', isPaid: '' })
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) resetState()
  }

  function guessMapping(detectedHeaders: string[]) {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    
    const newMap = { date: '', description: '', amount: '', type: '', category: '', isPaid: '' }
    
    detectedHeaders.forEach(h => {
      const norm = normalize(h)
      if (norm.includes('data') || norm.includes('date')) newMap.date = h
      else if (norm.includes('desc') || norm.includes('titulo') || norm.includes('title') || norm.includes('historico')) newMap.description = h
      else if (norm.includes('valor') || norm.includes('amount') || norm.includes('preco')) newMap.amount = h
      else if (norm.includes('tipo') || norm.includes('type')) newMap.type = h
      else if (norm.includes('cat')) newMap.category = h
      else if (norm.includes('pago') || norm.includes('paid')) newMap.isPaid = h
    })
    
    setMapping(newMap)
  }

  function handleFileParse() {
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const detectedHeaders = results.meta.fields || Object.keys(results.data[0] as any)
          setHeaders(detectedHeaders)
          setRawData(results.data)
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
      // Clean up money formatting: replace R$, replace commas with dots or just remove dots if it's brazilian format (ex: 1.000,50 -> 1000.50)
      rawAmount = rawAmount.replace(/[R$\s]/g, '')
      if (rawAmount.includes(',') && rawAmount.includes('.')) {
        // likely 1.000,50
        rawAmount = rawAmount.replace(/\./g, '').replace(',', '.')
      } else if (rawAmount.includes(',')) {
        // likely 1000,50
        rawAmount = rawAmount.replace(',', '.')
      }
      let amount = parseFloat(rawAmount)

      // Parse Date (Attempt to normalize)
      const rawDate = String(row[mapping.date] || '').trim()
      let date = rawDate
      
      const dateParts = rawDate.split(/[-/]/);
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
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      // Parse Type
      let type: 'income' | 'expense' = 'expense'
      if (mapping.type && row[mapping.type]) {
        const t = String(row[mapping.type]).toLowerCase()
        if (t.includes('rec') || t.includes('in') || t.includes('+')) type = 'income'
      } else {
        // infer from amount if no type column
        if (amount > 0) type = 'income'
        else type = 'expense'
      }
      
      amount = Math.abs(amount) // Ensure positive, type handles income/expense

      // Parse isPaid
      let isPaid = true // default to true unless specified
      if (mapping.isPaid && row[mapping.isPaid]) {
        const p = String(row[mapping.isPaid]).toLowerCase()
        if (p.includes('nao') || p.includes('não') || p.includes('false') || p === '0') isPaid = false
      }

      return {
        date,
        description: String(row[mapping.description] || '').trim(),
        amount,
        type,
        category_name: mapping.category ? String(row[mapping.category] || '').trim() : '',
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={workspaces.length === 0}>
          <Upload className="mr-2 h-4 w-4" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        
        {step === 'setup' && (
          <>
            <DialogHeader>
              <DialogTitle>Importar Transações (CSV)</DialogTitle>
              <DialogDescription>
                Faça o upload do seu extrato bancário. Nós vamos te ajudar a mapear as colunas no próximo passo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                <p className="text-xs text-muted-foreground">Selecione caso este CSV seja a fatura de um cartão.</p>
              </div>
              <div className="grid gap-2 mt-4">
                <Label>Arquivo CSV</Label>
                <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!file || !workspaceId} onClick={handleFileParse}>
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
                Indique qual coluna do seu arquivo representa cada informação.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-rose-500 font-bold">Data *</Label>
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
                {previewData.length} transações foram processadas com sucesso. Verifique se os dados estão corretos antes de salvar. Categorias novas serão criadas automaticamente.
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
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((tx, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{tx.description}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {tx.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </TableCell>
                      <TableCell>{tx.category_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
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
