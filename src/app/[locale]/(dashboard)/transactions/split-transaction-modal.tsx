'use client'

import { useState, useEffect, useTransition } from 'react'
import { Split, Plus, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTransactionSplits, saveTransactionSplits } from '@/app/actions/splits'
import { useRouter } from 'next/navigation'

export interface Payer {
  id: string;
  name: string;
  workspace_id: string;
}

export interface SplitItemState {
  id?: string;
  payer_id: string;
  amount: number | string;
  is_paid: boolean;
}

export interface TransactionToSplit {
  id: string;
  description: string;
  amount: number;
  date: string;
  workspace_id: string;
  credit_cards?: { name: string } | null;
  payer_id?: string | null;
}

export function SplitTransactionModal({
  transaction,
  payers,
  open,
  onOpenChange
}: {
  transaction: TransactionToSplit | null;
  payers: Payer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [splits, setSplits] = useState<SplitItemState[]>([])

  const totalAmount = transaction?.amount || 0
  const filteredPayers = payers.filter(p => !transaction || p.workspace_id === transaction.workspace_id)

  // Ao abrir o modal, busca splits existentes no banco
  useEffect(() => {
    if (!open || !transaction) return

    let active = true

    Promise.resolve().then(async () => {
      if (!active) return
      setLoading(true)
      setErrorMsg(null)
      const res = await getTransactionSplits(transaction.id)
      if (!active) return
      setLoading(false)
      if (res.data && res.data.length > 0) {
        setSplits(res.data.map(s => ({
          id: s.id,
          payer_id: s.payer_id,
          amount: s.amount,
          is_paid: Boolean(s.is_paid)
        })))
      } else {
        // Inicializa com 2 linhas para facilitar o rateio
        setSplits([
          { payer_id: transaction.payer_id || '', amount: '', is_paid: false },
          { payer_id: '', amount: '', is_paid: false }
        ])
      }
    })

    return () => {
      active = false
    }
  }, [open, transaction])

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setSplits([])
      setErrorMsg(null)
      setLoading(false)
    }
    onOpenChange(nextOpen)
  }

  // Cálculo da soma e da diferença
  const currentSum = splits.reduce((sum, s) => {
    const val = typeof s.amount === 'number' ? s.amount : parseFloat(String(s.amount).replace(',', '.')) || 0
    return sum + val
  }, 0)

  const remaining = parseFloat((totalAmount - currentSum).toFixed(2))
  const isBalanced = Math.abs(remaining) < 0.01

  function addSplitRow() {
    setSplits([...splits, { payer_id: '', amount: '', is_paid: false }])
  }

  function removeSplitRow(index: number) {
    setSplits(splits.filter((_, i) => i !== index))
  }

  function updateRowPayer(index: number, payerId: string) {
    const updated = [...splits]
    updated[index].payer_id = payerId
    setSplits(updated)
  }

  function updateRowAmount(index: number, val: string) {
    const updated = [...splits]
    updated[index].amount = val
    setSplits(updated)
  }

  function splitEqually() {
    const validCount = splits.length
    if (validCount === 0) return

    const splitPerPerson = parseFloat((totalAmount / validCount).toFixed(2))
    const updated = splits.map((s, idx) => {
      // Ajuste de centavos na última pessoa
      if (idx === validCount - 1) {
        const allocated = splitPerPerson * (validCount - 1)
        return { ...s, amount: parseFloat((totalAmount - allocated).toFixed(2)) }
      }
      return { ...s, amount: splitPerPerson }
    })
    setSplits(updated)
  }

  function handleSave() {
    if (!transaction) return
    setErrorMsg(null)

    // Valida se todos os participantes foram selecionados
    const validSplits = splits.filter(s => s.payer_id)
    if (validSplits.length === 0) {
      setErrorMsg('Selecione ao menos um participante para o rateio.')
      return
    }

    if (!isBalanced) {
      setErrorMsg(`A soma das cotas (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSum)}) deve ser igual ao valor total da compra (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}).`)
      return
    }

    startTransition(async () => {
      const payload = validSplits.map(s => ({
        payer_id: s.payer_id,
        amount: typeof s.amount === 'number' ? s.amount : parseFloat(String(s.amount).replace(',', '.')) || 0,
        is_paid: s.is_paid
      }))

      const res = await saveTransactionSplits({
        transactionId: transaction.id,
        splits: payload
      })

      if (res.error) {
        setErrorMsg('Erro ao salvar: ' + res.error)
      } else {
        handleClose(false)
        router.refresh()
      }
    })
  }

  function handleClearSplits() {
    if (!transaction) return
    startTransition(async () => {
      const res = await saveTransactionSplits({
        transactionId: transaction.id,
        splits: []
      })
      if (res.error) {
        setErrorMsg('Erro ao limpar rateio: ' + res.error)
      } else {
        handleClose(false)
        router.refresh()
      }
    })
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5 text-primary" /> Ratear Despesa
          </DialogTitle>
          <DialogDescription>
            Divida o valor desta compra entre múltiplos participantes.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da Compra */}
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm truncate max-w-[280px]">{transaction.description}</p>
            <p className="text-xs text-muted-foreground">
              {transaction.credit_cards ? `Cartão: ${transaction.credit_cards.name}` : 'À vista'} • {transaction.date.split('-').reverse().join('/')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Valor Total</div>
            <div className="text-lg font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Carregando rateios...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {errorMsg && (
              <div className="rounded-md bg-destructive/15 p-2.5 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Linhas de Rateio */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto px-1">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                <div className="col-span-7">Pessoa / Pagador</div>
                <div className="col-span-4">Cota (R$)</div>
                <div className="col-span-1"></div>
              </div>

              {splits.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <Select 
                      value={row.payer_id || undefined} 
                      onValueChange={(val) => updateRowPayer(idx, val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione a pessoa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPayers.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-4">
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      className="h-9 text-xs"
                      value={row.amount}
                      onChange={(e) => updateRowAmount(idx, e.target.value)}
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSplitRow(idx)}
                      disabled={splits.length <= 1}
                      title="Remover linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Botões de Ação Rápida de Adição e Divisão */}
            <div className="flex items-center justify-between pt-1 border-t">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs gap-1.5"
                onClick={addSplitRow}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Pessoa
              </Button>

              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                className="h-8 text-xs"
                onClick={splitEqually}
              >
                Dividir Igualmente
              </Button>
            </div>

            {/* Balanço / Validador */}
            <div className="rounded-lg border p-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">Total Rateado: </span>
                <span className="font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSum)}
                </span>
              </div>

              <div>
                {isBalanced ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Divisão exata (100%)
                  </span>
                ) : remaining > 0 ? (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Faltam {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)}
                  </span>
                ) : (
                  <span className="font-semibold text-destructive">
                    Passou {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(remaining))}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          {splits.some(s => s.id) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={handleClearSplits}
              disabled={isPending || loading}
            >
              Remover Rateio
            </Button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isPending || loading || !isBalanced}
            >
              {isPending ? 'Salvando...' : 'Salvar Rateio'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
