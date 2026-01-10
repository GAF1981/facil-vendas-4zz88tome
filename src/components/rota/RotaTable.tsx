import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface RotaTableProps {
  rows: RotaRow[]
  sellers?: Employee[]
  onUpdateRow?: (clientId: number, field: string, value: any) => void
  disabled?: boolean
  onSort?: (key: string) => void
  sortConfig?: SortConfig
  loading?: boolean
}

export function RotaTable({
  rows = [],
  sellers = [],
  onUpdateRow,
  disabled = false,
  onSort,
  sortConfig,
  loading = false,
}: RotaTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VENCIDO':
        return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
      case 'A VENCER':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
      case 'PAGO':
        return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VENCIDO':
        return <XCircle className="w-3 h-3 mr-1" />
      case 'A VENCER':
        return <AlertTriangle className="w-3 h-3 mr-1" />
      case 'PAGO':
        return <CheckCircle2 className="w-3 h-3 mr-1" />
      default:
        return <Clock className="w-3 h-3 mr-1" />
    }
  }

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />
    if (sortConfig.direction === 'asc')
      return <ArrowUp className="ml-2 h-4 w-4" />
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  const handleSortClick = (key: string) => {
    if (onSort) onSort(key)
  }

  if (loading) {
    return (
      <div className="rounded-md border bg-card p-8 flex flex-col items-center justify-center text-muted-foreground h-96">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
        <p>Carregando dados da rota...</p>
      </div>
    )
  }

  // Safe access to rows length
  const hasRows = Array.isArray(rows) && rows.length > 0

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[50px] text-center">#</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="min-w-[200px]">Cliente</TableHead>
            <TableHead className="text-center w-[80px]">Pedido</TableHead>
            <TableHead className="text-right w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent"
                onClick={() => handleSortClick('estoque')}
              >
                Estoque (R$)
                {renderSortIcon('estoque')}
              </Button>
            </TableHead>
            <TableHead className="text-right w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent"
                onClick={() => handleSortClick('projecao')}
              >
                Projeção (R$)
                {renderSortIcon('projecao')}
              </Button>
            </TableHead>
            <TableHead className="text-center w-[80px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent"
                onClick={() => handleSortClick('x_na_rota')}
              >
                X Rota
                {renderSortIcon('x_na_rota')}
              </Button>
            </TableHead>
            <TableHead className="w-[100px] text-center">Extras</TableHead>
            <TableHead className="text-right w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent"
                onClick={() => handleSortClick('debito')}
              >
                Débito Total
                {renderSortIcon('debito')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px] text-right">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent"
                onClick={() => handleSortClick('data_acerto')}
              >
                Último Acerto
                {renderSortIcon('data_acerto')}
              </Button>
            </TableHead>
            <TableHead className="w-[150px]">Vendedor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!hasRows ? (
            <TableRow>
              <TableCell
                colSpan={11}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <MapPin className="h-8 w-8 text-muted-foreground/50" />
                  <p className="font-medium">Nenhum cliente na rota</p>
                  <p className="text-xs">
                    Inicie uma rota ou altere os filtros para ver os clientes.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.client.CODIGO}
                className={cn(
                  'hover:bg-muted/30 transition-colors',
                  row.is_completed && 'bg-green-50/40 hover:bg-green-50/60',
                )}
              >
                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                  {row.rowNumber}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-normal text-[10px] whitespace-nowrap px-2 py-0.5 h-6',
                      getStatusColor(row.vencimento_status),
                    )}
                  >
                    {getStatusIcon(row.vencimento_status)}
                    {row.vencimento_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col max-w-[200px]">
                    <span
                      className="font-medium text-sm truncate"
                      title={row.client['NOME CLIENTE'] || ''}
                    >
                      {row.client['NOME CLIENTE']}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">#{row.client.CODIGO}</span>
                      <span>•</span>
                      <span
                        className="truncate"
                        title={row.client.MUNICÍPIO || ''}
                      >
                        {row.client.MUNICÍPIO}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {row.numero_pedido ? (
                    <span className="font-mono text-sm font-medium text-blue-600">
                      #{row.numero_pedido}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">
                    {formatCurrency(row.estoque ?? 0)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {row.projecao !== null && row.projecao !== undefined ? (
                    <span className="font-medium text-orange-600">
                      {formatCurrency(row.projecao)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-mono font-medium">
                    {row.x_na_rota ?? 0}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    {row.boleto && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 h-5 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        BOL
                      </Badge>
                    )}
                    {row.agregado && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 h-5 bg-purple-50 text-purple-700 border-purple-200"
                      >
                        AGR
                      </Badge>
                    )}
                    {!row.boleto && !row.agregado && (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={cn(
                        'font-medium',
                        row.debito > 0.05 ? 'text-red-600' : 'text-slate-600',
                      )}
                    >
                      {formatCurrency(row.debito ?? 0)}
                    </span>
                    {row.quant_debito > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({row.quant_debito}{' '}
                        {row.quant_debito === 1 ? 'pedido' : 'pedidos'})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm">
                      {safeFormatDate(row.data_acerto, 'dd/MM/yy')}
                    </span>
                    {row.earliest_unpaid_date && (
                      <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">
                        Venc:{' '}
                        {safeFormatDate(row.earliest_unpaid_date, 'dd/MM')}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    disabled={disabled}
                    value={
                      row.vendedor_id ? row.vendedor_id.toString() : 'none'
                    }
                    onValueChange={(value) => {
                      if (onUpdateRow) {
                        // If 'none' is selected, send null, otherwise send number ID
                        onUpdateRow(
                          row.client.CODIGO,
                          'vendedor_id',
                          value === 'none' ? null : Number(value),
                        )
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-full bg-transparent border-transparent hover:border-input hover:bg-background focus:bg-background focus:border-input">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {sellers.map((seller) => (
                        <SelectItem
                          key={seller.id}
                          value={seller.id.toString()}
                        >
                          {seller.nome_completo.split(' ')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
