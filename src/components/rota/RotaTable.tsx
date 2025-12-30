import { Table, TableBody } from '@/components/ui/table'
import { RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { RotaTableHeader } from './RotaTableHeader'
import { RotaTableRow } from './RotaTableRow'

interface RotaTableProps {
  rows: RotaRow[]
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled: boolean
  sortConfig: SortConfig
  onSort: (key: string) => void
}

export function RotaTable({
  rows,
  sellers,
  onUpdateRow,
  disabled,
  sortConfig,
  onSort,
}: RotaTableProps) {
  return (
    <div className="rounded-md border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto relative">
        <Table className="min-w-[2000px] border-separate border-spacing-0">
          <RotaTableHeader sortConfig={sortConfig} onSort={onSort} />
          <TableBody>
            {rows.map((row) => (
              <RotaTableRow
                key={row.client.CODIGO}
                row={row}
                sellers={sellers}
                onUpdateRow={onUpdateRow}
                disabled={disabled}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={23} className="h-24 text-center">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
