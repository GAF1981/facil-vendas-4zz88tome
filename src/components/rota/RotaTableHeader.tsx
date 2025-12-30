import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortConfig } from '@/types/rota'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RotaTableHeaderProps {
  sortConfig: SortConfig
  onSort: (key: string) => void
}

export function RotaTableHeader({ sortConfig, onSort }: RotaTableHeaderProps) {
  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/30" />
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-foreground" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-foreground" />
    )
  }

  const renderHead = (label: string, key: string, className?: string) => (
    <TableHead
      className={cn(
        'bg-muted cursor-pointer hover:bg-muted/80 transition-colors select-none group',
        className,
      )}
      onClick={() => onSort(key)}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {renderSortIcon(key)}
      </div>
    </TableHead>
  )

  return (
    <TableHeader className="bg-muted sticky top-0 z-20 shadow-sm">
      <TableRow>
        {renderHead('#', 'rowNumber', 'w-[60px] text-center font-bold')}
        {renderHead('x na ROTA', 'x_na_rota', 'w-[100px] text-center')}
        {renderHead('Nota Fiscal', 'nota_fiscal', 'w-[110px]')}
        {renderHead('Boleto', 'boleto', 'w-[80px] text-center')}
        {renderHead('Agregado', 'agregado', 'w-[90px] text-center')}
        {renderHead('Vendedor', 'vendedor', 'w-[150px]')}
        {renderHead('Débito', 'debito', 'w-[110px] text-right')}
        {renderHead('Qtd. Déb.', 'quant_debito', 'w-[100px] text-center')}
        {renderHead('Data Acerto', 'data_acerto', 'w-[120px]')}
        {renderHead('CÓDIGO', 'codigo', 'w-[100px]')}
        {renderHead('NOME CLIENTE', 'nome', 'min-w-[200px]')}
        {renderHead('ROTA', 'rota', 'w-[120px]')}
        {renderHead('PROJEÇÃO', 'projecao', 'w-[110px] text-right')}
        {renderHead('ESTOQUE', 'estoque', 'w-[100px] text-right')}
        {renderHead('ENDEREÇO', 'endereco', 'min-w-[200px]')}
        {renderHead('BAIRRO', 'bairro', 'min-w-[150px]')}
        {renderHead('MUNICÍPIO', 'municipio', 'min-w-[150px]')}
        {renderHead('CONTATO 1', 'contato1', 'w-[120px]')}
        {renderHead('CONTATO 2', 'contato2', 'w-[120px]')}
        {renderHead('CEP', 'cep', 'w-[100px]')}
        {renderHead('TIPO', 'tipo', 'w-[120px]')}
        {renderHead('FONE 1', 'fone1', 'w-[140px]')}
        {renderHead('FONE 2', 'fone2', 'w-[140px]')}
      </TableRow>
    </TableHeader>
  )
}
