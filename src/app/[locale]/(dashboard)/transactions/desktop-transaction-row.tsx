'use client'

import React, { memo } from 'react'
import { format } from 'date-fns'
import { ArrowDownCircle, ArrowUpCircle, Pencil, Copy, Trash2, Split } from 'lucide-react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface DesktopTransactionRowProps {
  tx: any
  isSelected: boolean
  hasSplit: boolean
  onSelectRow: (id: string, checked: boolean) => void
  onTogglePaid: (id: string, currentStatus: boolean) => void
  onSplit: (tx: any) => void
  onClone: (tx: any) => void
  onEdit: (tx: any) => void
  onDelete: (tx: any) => void
}

export const DesktopTransactionRow = memo(function DesktopTransactionRow({
  tx,
  isSelected,
  hasSplit,
  onSelectRow,
  onTogglePaid,
  onSplit,
  onClone,
  onEdit,
  onDelete
}: DesktopTransactionRowProps) {
  const isIncome = tx.type === 'income'
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)
  const dueDateDisplay = tx.due_date ? tx.due_date : tx.date
  const purchaseDateDisplay = tx.date

  return (
    <TableRow key={tx.id}>
      <TableCell>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(c) => onSelectRow(tx.id, !!c)}
        />
      </TableCell>
      <TableCell className="font-medium whitespace-nowrap">
        {format(new Date(dueDateDisplay + 'T12:00:00'), 'dd/MM/yyyy')}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
        {format(new Date(purchaseDateDisplay + 'T12:00:00'), 'dd/MM/yyyy')}
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {isIncome ? <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500 shrink-0" />}
            <span className="truncate">{tx.description}</span>
            {tx.installments > 1 && <span className="text-xs text-muted-foreground ml-1 shrink-0">({tx.installments}x)</span>}
          </div>
          {tx.payers && (
            <div className="flex items-center ml-6">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                Pagador: {tx.payers.name}
              </span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {tx.categories ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${tx.categories.color}20`, color: tx.categories.color }}>
            {tx.categories.name}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs italic">Sem categoria</span>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm">{tx.workspaces?.name}</div>
        {tx.credit_cards && <div className="text-xs text-muted-foreground">{tx.credit_cards.name}</div>}
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Checkbox 
            checked={tx.is_paid} 
            onCheckedChange={() => onTogglePaid(tx.id, tx.is_paid)} 
          />
          <span className={`text-sm ${tx.is_paid ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
            {tx.is_paid ? 'Pago' : 'Pendente'}
          </span>
        </div>
      </TableCell>
      <TableCell className={`text-right font-bold ${isIncome ? 'text-emerald-500' : ''}`}>
        {isIncome ? '+' : '-'}{formattedAmount}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant={hasSplit ? "secondary" : "ghost"} 
            size="icon" 
            onClick={() => onSplit(tx)} 
            className={`h-8 w-8 transition-colors ${
              hasSplit 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30' 
                : 'text-muted-foreground hover:text-primary'
            }`} 
            title={hasSplit ? "Despesa com Rateio (Clique para gerenciar)" : "Ratear Despesa"}
          >
            <Split className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onClone(tx)} className="text-muted-foreground h-8 w-8" title="Clonar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(tx)} className="text-muted-foreground h-8 w-8" title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(tx)} className="text-destructive h-8 w-8" title="Deletar">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})
