'use client'

import React, { memo } from 'react'
import { format } from 'date-fns'
import { ArrowDownCircle, ArrowUpCircle, Pencil, Copy, Trash2, Split } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface MobileTransactionCardProps {
  tx: any
  hasSplit: boolean
  onTogglePaid: (id: string, currentStatus: boolean) => void
  onSplit: (tx: any) => void
  onClone: (tx: any) => void
  onEdit: (tx: any) => void
  onDelete: (tx: any) => void
}

export const MobileTransactionCard = memo(function MobileTransactionCard({
  tx,
  hasSplit,
  onTogglePaid,
  onSplit,
  onClone,
  onEdit,
  onDelete
}: MobileTransactionCardProps) {
  const isIncome = tx.type === 'income'
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)
  const dueDateDisplay = tx.due_date ? tx.due_date : tx.date

  return (
    <div
      key={tx.id}
      className="rounded-xl border bg-card p-3 shadow-2xs space-y-2 transition-all w-full max-w-full overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 shrink-0" title={tx.is_paid ? 'Marcar como pendente' : 'Marcar como pago'}>
            <Checkbox 
              checked={tx.is_paid} 
              onCheckedChange={() => onTogglePaid(tx.id, tx.is_paid)}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isIncome ? (
                <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              )}
              <span className="font-semibold text-xs text-foreground truncate">
                {tx.description}
              </span>
              {tx.installments > 1 && (
                <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                  ({tx.installments}x)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">
                Venc: {format(new Date(dueDateDisplay + 'T12:00:00'), 'dd/MM/yy')}
              </span>
              {tx.credit_cards && (
                <span className="inline-flex items-center gap-1">
                  • <span>{tx.credit_cards.name}</span>
                </span>
              )}
              {tx.payers && (
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.2 text-[9px] font-medium text-blue-800 dark:text-blue-300">
                  {tx.payers.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={`font-bold text-xs sm:text-sm ${isIncome ? 'text-emerald-500' : 'text-foreground'}`}>
            {isIncome ? '+' : '-'}{formattedAmount}
          </div>
          <div className="text-[10px] mt-0.5">
            <span className={`inline-block px-1.5 py-0.2 rounded-full font-medium ${tx.is_paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {tx.is_paid ? 'Pago' : 'Pendente'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px]">
        <div>
          {tx.categories ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
              style={{ backgroundColor: `${tx.categories.color}20`, color: tx.categories.color }}
            >
              {tx.categories.name}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Sem categoria</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant={hasSplit ? "secondary" : "ghost"} 
            size="icon" 
            onClick={() => onSplit(tx)} 
            className="h-6 w-6 text-muted-foreground"
            title="Rateio"
          >
            <Split className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClone(tx)}
            className="h-6 w-6 text-muted-foreground"
            title="Clonar"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(tx)}
            className="h-6 w-6 text-muted-foreground"
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(tx)}
            className="h-6 w-6 text-destructive"
            title="Deletar"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
})
