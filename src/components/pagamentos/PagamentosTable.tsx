import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PagamentoRow } from '@/types/pagamentos'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

interface PagamentosTableProps {
  data: PagamentoRow[]
}

export function PagamentosTable({ data }: PagamentosTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[150px]">Número do Pedido</TableHead>
            <TableHead className="w-[120px]">Código Cliente</TableHead>
            <TableHead>Nome Cliente</TableHead>
            <TableHead className="w-[180px]">Forma de pagamento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="font-medium">Nenhum pagamento Pix encontrado</p>
                  <p className="text-xs">
                    Não há registros pendentes de conferência para este filtro.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-blue-600">
                  {row.id_da_femea ? `#${row.id_da_femea}` : '-'}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {row.cliente_id}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.cliente_nome}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                  >
                    {row.forma_pagamento}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  R$ {formatCurrency(row.valor)}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {row.data
                    ? format(parseISO(row.data), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })
                    : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
