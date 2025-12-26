import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScanBarcode } from 'lucide-react'
import { Product, formatPrice } from '@/types/product'

interface ProductCardItemProps {
  product: Product
}

export function ProductCardItem({ product }: ProductCardItemProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="mb-2">
            #{product.CODIGO}
          </Badge>
          <span className="font-bold text-green-700">
            {formatPrice(product.PREÇO)}
          </span>
        </div>
        <CardTitle className="text-base line-clamp-2">
          {product.MERCADORIA}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 text-sm text-muted-foreground space-y-2">
        {product['CÓDIGO BARRAS'] && (
          <div className="flex items-center gap-1">
            <ScanBarcode className="h-3 w-3" />
            <span>{product['CÓDIGO BARRAS']}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {product.GRUPO && (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground/80">Grupo:</span>
              <span>{product.GRUPO}</span>
            </div>
          )}
          {product.TIPO && (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground/80">Tipo:</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {product.TIPO}
              </Badge>
            </div>
          )}
        </div>
        {product['DESCRIÇÃO RESUMIDA'] && (
          <div className="bg-muted p-2 rounded text-xs mt-2">
            {product['DESCRIÇÃO RESUMIDA']}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
