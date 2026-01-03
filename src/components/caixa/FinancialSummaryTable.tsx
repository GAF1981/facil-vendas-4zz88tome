import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CaixaSummaryRow } from '@/services/caixaService'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface FinancialSummaryTableProps {
  data: CaixaSummaryRow[]
}

export function FinancialSummaryTable({ data }: FinancialSummaryTableProps) {
  const totalRecebido = data.reduce((acc, row) => acc + row.totalRecebido, 0)
  const totalDespesas = data.reduce((acc, row) => acc + row.totalDespesas, 0)
  const totalCaixa = data.reduce((acc, row) => acc + row.saldo, 0)

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead className="text-right text-green-700">
              Valores Recebidos
            </TableHead>
            <TableHead className="text-right text-red-700">Despesas</TableHead>
            <TableHead className="text-right font-bold text-blue-700">
              Valor de Caixa
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma movimentação financeira encontrada para esta rota.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((row) => (
                <TableRow key={row.funcionarioId} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {row.funcionarioNome}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    R$ {formatCurrency(row.totalRecebido)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    R$ {formatCurrency(row.totalDespesas)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono font-bold',
                      row.saldo >= 0 ? 'text-blue-600' : 'text-red-600',
                    )}
                  >
                    R$ {formatCurrency(row.saldo)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totalizer Row */}
              <TableRow className="bg-muted/50 font-bold border-t-2">
                <TableCell>TOTAL GERAL</TableCell>
                <TableCell className="text-right text-green-700">
                  R$ {formatCurrency(totalRecebido)}
                </TableCell>
                <TableCell className="text-right text-red-700">
                  R$ {formatCurrency(totalDespesas)}
                </TableCell>
                <TableCell className="text-right text-blue-700">
                  R$ {formatCurrency(totalCaixa)}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
