import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RotaRow } from '@/types/rota'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface RotaTableProps {
  data: RotaRow[]
}

export function RotaTable({ data }: RotaTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[60px] text-center">#</TableHead>
            <TableHead className="w-[300px]">Cliente</TableHead>
            <TableHead className="w-[80px] text-center">Rota</TableHead>
            <TableHead className="text-right">Débito</TableHead>
            <TableHead className="text-right">Estoque (R$)</TableHead>
            <TableHead className="text-center">Último Pedido</TableHead>
            <TableHead className="text-center">Última Data</TableHead>
            <TableHead className="w-[120px] text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="font-medium">Nenhum cliente na rota</p>
                  <p className="text-xs">
                    Não há registros correspondentes aos filtros atuais.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={row.client.CODIGO}
                className={cn('hover:bg-muted/30', {
                  'bg-green-50/50 hover:bg-green-100/50': row.is_completed,
                  'bg-yellow-50/50 hover:bg-yellow-100/50': row.has_pendency,
                })}
              >
                <TableCell className="text-center text-muted-foreground font-mono text-xs">
                  {row.rowNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {row.client['NOME CLIENTE']}
                    </span>
                    <span className="text-xs text-muted-foreground flex gap-2">
                      <span>Cod: {row.client.CODIGO}</span>
                      {row.client.MUNICÍPIO && (
                        <span>• {row.client.MUNICÍPIO}</span>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {row.x_na_rota > 0 ? (
                    <Badge variant="secondary" className="font-mono">
                      {row.x_na_rota}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {row.debito > 0 ? `R$ ${formatCurrency(row.debito)}` : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-blue-600">
                  {/* Display calculated Stock Value based on Order ID matching */}
                  {row.numero_pedido ? (
                    `R$ ${formatCurrency(row.estoque)}`
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono text-xs">
                  {row.numero_pedido || '-'}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {row.data_acerto
                    ? safeFormatDate(row.data_acerto, 'dd/MM/yy')
                    : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {row.vencimento_status === 'VENCIDO' && (
                    <Badge variant="destructive" className="text-[10px]">
                      VENCIDO
                    </Badge>
                  )}
                  {row.vencimento_status === 'A VENCER' && (
                    <Badge
                      variant="outline"
                      className="text-yellow-600 border-yellow-200 bg-yellow-50 text-[10px]"
                    >
                      A VENCER
                    </Badge>
                  )}
                  {row.vencimento_status === 'PAGO' && (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-200 bg-green-50 text-[10px]"
                    >
                      PAGO
                    </Badge>
                  )}
                  {row.vencimento_status === 'SEM DÉBITO' && (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
