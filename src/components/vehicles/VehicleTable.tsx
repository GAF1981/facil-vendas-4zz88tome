import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Vehicle } from '@/types/vehicle'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { safeFormatDate } from '@/lib/formatters'

interface VehicleTableProps {
  data: Vehicle[]
  onEdit: (vehicle: Vehicle) => void
  onDelete: (id: number) => void
}

export function VehicleTable({ data, onEdit, onDelete }: VehicleTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Hodômetro Inicial</TableHead>
            <TableHead>Data Cadastro</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum veículo encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((vehicle) => (
              <TableRow key={vehicle.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{vehicle.placa}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      vehicle.status === 'ATIVO' ? 'default' : 'secondary'
                    }
                    className={
                      vehicle.status === 'ATIVO'
                        ? 'bg-green-600 hover:bg-green-700'
                        : ''
                    }
                  >
                    {vehicle.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {vehicle.hodometro_cadastro}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {safeFormatDate(vehicle.created_at, 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(vehicle)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
