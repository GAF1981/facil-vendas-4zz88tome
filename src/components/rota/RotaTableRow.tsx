import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotaRow } from '@/types/rota'
import { Employee } from '@/types/employee'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { AlertCircle, Phone, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { memo } from 'react'

interface RotaTableRowProps {
  row: RotaRow
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled: boolean
}

const getRowColorClass = (row: RotaRow) => {
  if (row.debito > 10) return 'bg-red-100 hover:bg-red-200'
  if (row.x_na_rota > 3) return 'bg-purple-100 hover:bg-purple-200'
  if (row.has_pendency) return 'bg-orange-100 hover:bg-orange-200'
  if (row.client['OBSERVAÇÃO FIXA']) return 'bg-yellow-100 hover:bg-yellow-200'
  if (row.is_completed) return 'bg-green-100 hover:bg-green-200'
  return 'hover:bg-muted/50'
}

export const RotaTableRow = memo(function RotaTableRow({
  row,
  sellers,
  onUpdateRow,
  disabled,
}: RotaTableRowProps) {
  return (
    <TableRow
      key={row.client.CODIGO}
      className={cn('transition-colors', getRowColorClass(row))}
    >
      <TableCell className="text-center font-bold">{row.rowNumber}</TableCell>

      <TableCell>
        <Input
          type="number"
          className="h-7 w-16 text-center mx-auto text-xs"
          value={row.x_na_rota}
          disabled={disabled}
          onChange={(e) =>
            onUpdateRow(
              row.client.CODIGO,
              'x_na_rota',
              parseInt(e.target.value) || 0,
            )
          }
        />
      </TableCell>

      <TableCell className="text-xs">
        {row.client['NOTA FISCAL'] || '-'}
      </TableCell>

      <TableCell className="text-center">
        <Checkbox
          checked={row.boleto}
          disabled={disabled}
          onCheckedChange={(c) =>
            onUpdateRow(row.client.CODIGO, 'boleto', c as boolean)
          }
        />
      </TableCell>

      <TableCell className="text-center">
        <Checkbox
          checked={row.agregado}
          disabled={disabled}
          onCheckedChange={(c) =>
            onUpdateRow(row.client.CODIGO, 'agregado', c as boolean)
          }
        />
      </TableCell>

      <TableCell>
        <Select
          value={row.vendedor_id?.toString() || 'none'}
          disabled={disabled}
          onValueChange={(v) =>
            onUpdateRow(
              row.client.CODIGO,
              'vendedor_id',
              v === 'none' ? null : parseInt(v),
            )
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.nome_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="text-right font-mono font-medium text-red-600 text-xs">
        {row.debito > 0 ? `R$ ${formatCurrency(row.debito)}` : '-'}
      </TableCell>

      <TableCell className="text-center text-xs">
        {row.quant_debito || '-'}
      </TableCell>

      <TableCell className="text-xs">
        {row.data_acerto
          ? format(parseISO(row.data_acerto), 'dd/MM/yyyy')
          : '-'}
      </TableCell>

      <TableCell className="font-mono text-xs">{row.client.CODIGO}</TableCell>

      <TableCell className="font-medium relative group/name text-xs">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[180px]">
            {row.client['NOME CLIENTE']}
          </span>
          {row.has_pendency && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-orange-600"
              asChild
              title="Ver Pendências"
            >
              <Link to={`/pendencias?search=${row.client.CODIGO}`}>
                <AlertCircle className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </TableCell>

      <TableCell className="text-xs">
        {row.client['GRUPO ROTA'] || '-'}
      </TableCell>

      <TableCell className="text-right font-mono font-semibold text-blue-700 text-xs">
        {row.projecao > 0 ? `R$ ${formatCurrency(row.projecao)}` : '-'}
      </TableCell>

      <TableCell className="text-right font-mono text-xs">
        {row.estoque > 0 ? row.estoque : '-'}
      </TableCell>

      <TableCell
        className="text-xs truncate max-w-[200px]"
        title={row.client.ENDEREÇO || ''}
      >
        {row.client.ENDEREÇO || '-'}
      </TableCell>
      <TableCell className="text-xs truncate max-w-[150px]">
        {row.client.BAIRRO || '-'}
      </TableCell>
      <TableCell className="text-xs truncate max-w-[150px]">
        {row.client.MUNICÍPIO || '-'}
      </TableCell>
      <TableCell className="text-xs truncate max-w-[120px]">
        {row.client['CONTATO 1'] || '-'}
      </TableCell>
      <TableCell className="text-xs truncate max-w-[120px]">
        {row.client['CONTATO 2'] || '-'}
      </TableCell>
      <TableCell className="text-xs">
        {row.client['CEP OFICIO'] || '-'}
      </TableCell>
      <TableCell className="text-xs">
        {row.client['TIPO DE CLIENTE'] || '-'}
      </TableCell>

      <TableCell>
        {row.client['FONE 1'] && (
          <a
            href={`https://wa.me/55${row.client['FONE 1'].replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-green-600 hover:underline text-xs"
          >
            <Phone className="h-3 w-3" />
            {row.client['FONE 1']}
            <ArrowUpRight className="h-3 w-3 opacity-50" />
          </a>
        )}
      </TableCell>

      <TableCell>
        {row.client['FONE 2'] && (
          <a
            href={`https://wa.me/55${row.client['FONE 2'].replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-green-600 hover:underline text-xs"
          >
            <Phone className="h-3 w-3" />
            {row.client['FONE 2']}
            <ArrowUpRight className="h-3 w-3 opacity-50" />
          </a>
        )}
      </TableCell>
    </TableRow>
  )
})
