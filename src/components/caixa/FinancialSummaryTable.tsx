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
import { Button } from '@/components/ui/button'
import { Eye, PlusCircle, FileText } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FinancialSummaryTableProps {
  data: CaixaSummaryRow[]
  onViewReceipts: (employeeId: number, employeeName: string) => void
  onViewExpenses: (employeeId: number, employeeName: string) => void
  onAddExpense: (employeeId: number, employeeName: string) => void
  onGeneratePdf: (employeeId: number, employeeName: string) => void
}

export function FinancialSummaryTable({
  data,
  onViewReceipts,
  onViewExpenses,
  onAddExpense,
  onGeneratePdf,
}: FinancialSummaryTableProps) {
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
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
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
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                              onClick={() =>
                                onGeneratePdf(
                                  row.funcionarioId,
                                  row.funcionarioNome,
                                )
                              }
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Gerar Relatório PDF</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {row.funcionarioNome}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-green-600">
                        R$ {formatCurrency(row.totalRecebido)}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                onViewReceipts(
                                  row.funcionarioId,
                                  row.funcionarioNome,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 text-green-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver Recebimentos</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-red-600">
                        R$ {formatCurrency(row.totalDespesas)}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                onViewExpenses(
                                  row.funcionarioId,
                                  row.funcionarioNome,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver Despesas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono font-bold',
                      row.saldo >= 0 ? 'text-blue-600' : 'text-red-600',
                    )}
                  >
                    R$ {formatCurrency(row.saldo)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() =>
                        onAddExpense(row.funcionarioId, row.funcionarioNome)
                      }
                    >
                      <PlusCircle className="mr-1 h-3 w-3" />
                      Cadastrar Despesa
                    </Button>
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
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
