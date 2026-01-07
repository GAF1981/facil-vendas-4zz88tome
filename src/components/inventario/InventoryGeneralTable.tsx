import { InventoryGeneralItem } from '@/types/inventory_general'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'
import { MovementDetailsPopover } from './MovementDetailsPopover'
import { Button } from '@/components/ui/button'
import { Ban } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Props {
  items: InventoryGeneralItem[]
  onMarkAsZero: (productId: number) => void
  readOnly?: boolean
}

export function InventoryGeneralTable({
  items,
  onMarkAsZero,
  readOnly = false,
}: Props) {
  return (
    <div className="rounded-md border bg-card overflow-x-auto shadow-sm max-h-[70vh] relative">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
          <TableRow>
            <TableHead className="w-[200px] bg-muted">Produto</TableHead>
            <TableHead className="bg-muted">Tipo</TableHead>
            <TableHead className="text-right bg-muted">Saldo Inicial</TableHead>
            <TableHead className="text-right text-green-600 bg-muted">
              Entradas (Compras)
            </TableHead>
            <TableHead className="text-right text-green-600 bg-muted">
              <div className="flex items-center justify-end gap-1">
                Entradas (Carro)
              </div>
            </TableHead>
            <TableHead className="text-right text-red-600 bg-muted">
              Saídas (Perdas)
            </TableHead>
            <TableHead className="text-right text-red-600 bg-muted">
              <div className="flex items-center justify-end gap-1">
                Saídas (Carro)
              </div>
            </TableHead>
            <TableHead className="text-right font-bold bg-muted">
              Saldo Final (Teórico)
            </TableHead>
            <TableHead className="text-right bg-blue-50">Contagem</TableHead>
            <TableHead className="text-right bg-muted">Dif (Qtd)</TableHead>
            <TableHead className="text-right bg-muted">Dif (Val)</TableHead>
            {/* Hidden per requirement: <TableHead className="text-right bg-yellow-50">Ajustes</TableHead> */}
            <TableHead className="text-right font-bold bg-gray-50">
              Novo Saldo Final
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.produto_id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{item.produto}</span>
                  <span className="text-xs text-muted-foreground">
                    Code: {item.codigo}
                  </span>
                </div>
              </TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell className="text-right font-mono">
                {item.saldo_inicial}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {item.compras}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                <div className="flex items-center justify-end gap-1">
                  {item.carro_para_estoque}
                  <MovementDetailsPopover
                    title="Entradas (Carro -> Estoque)"
                    details={item.details_carro_para_estoque}
                    colorClass="text-green-600"
                  />
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-red-600">
                {item.saidas_perdas}
              </TableCell>
              <TableCell className="text-right font-mono text-red-600">
                <div className="flex items-center justify-end gap-1">
                  {item.estoque_para_carro}
                  <MovementDetailsPopover
                    title="Saídas (Estoque -> Carro)"
                    details={item.details_estoque_para_carro}
                    colorClass="text-red-600"
                  />
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-bold">
                {item.saldo_final}
              </TableCell>
              <TableCell className="text-right font-mono bg-blue-50/50">
                <div className="flex items-center justify-end gap-2">
                  {item.has_count_record ? (
                    <span>{item.contagem}</span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">
                      Pendente
                    </span>
                  )}

                  {!readOnly && !item.has_count_record && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-600"
                          onClick={() => onMarkAsZero(item.produto_id)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Marcar como Zero (Não encontrado)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell
                className={`text-right font-mono ${item.diferenca_qty < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {item.diferenca_qty}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatCurrency(item.diferenca_val)}
              </TableCell>
              {/* Hidden per requirement: <TableCell className="text-right font-mono bg-yellow-50/50">{item.ajustes}</TableCell> */}
              <TableCell className="text-right font-mono font-bold bg-gray-50/50">
                {item.novo_saldo_final}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
