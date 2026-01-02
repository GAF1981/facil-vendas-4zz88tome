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

interface PagamentosTableProps {
  data: PagamentoRow[]
}

export function PagamentosTable({ data }: PagamentosTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[120px]">Número do Pedido</TableHead>
            <TableHead className="w-[100px]">Código Cliente</TableHead>
            <TableHead>Nome Cliente</TableHead>
            <TableHead>Forma de pagamento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum pagamento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-blue-600">
                  {row.id_da_femea ? `#${row.id_da_femea}` : '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.cliente_id}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.cliente_nome}</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200">
                    {row.forma_pagamento}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  R$ {formatCurrency(row.valor)}
                </TableCell>
                <TableCell className="text-right text-sm">
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
