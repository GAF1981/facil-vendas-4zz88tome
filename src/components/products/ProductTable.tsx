import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Product, formatPrice } from '@/types/product'

interface ProductTableProps {
  products: Product[]
}

export function ProductTable({ products }: ProductTableProps) {
  return (
    <div className="hidden sm:block rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Código</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cód. Barras</TableHead>
            <TableHead className="text-right">Preço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.CODIGO}>
              <TableCell className="font-medium">{product.CODIGO}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{product.MERCADORIA}</span>
                  {product['DESCRIÇÃO RESUMIDA'] && (
                    <span className="text-xs text-muted-foreground">
                      {product['DESCRIÇÃO RESUMIDA']}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{product.GRUPO || '-'}</TableCell>
              <TableCell>
                {product.TIPO ? (
                  <Badge variant="secondary" className="font-normal">
                    {product.TIPO}
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{product['CÓDIGO BARRAS'] || '-'}</TableCell>
              <TableCell className="text-right font-bold">
                {formatPrice(product.PREÇO)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
