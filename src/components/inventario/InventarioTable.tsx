import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventoryProduct } from '@/types/inventario'
import { formatCurrency } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'

interface InventarioTableProps {
  data: InventoryProduct[]
}

export function InventarioTable({ data }: InventarioTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead className="w-[120px]">Cód. Barras</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="w-[150px]">Grupo</TableHead>
              <TableHead className="text-right w-[120px]">Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-medium">
                    {item.codigo || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.codigo_barras || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.produto || 'Produto Sem Nome'}
                  </TableCell>
                  <TableCell>
                    {item.grupo ? (
                      <Badge variant="outline" className="text-[10px]">
                        {item.grupo}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {formatCurrency(item.preco)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
