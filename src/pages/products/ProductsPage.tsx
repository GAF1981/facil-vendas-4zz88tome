import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Loader2,
  ScanBarcode,
  ChevronLeft,
  ChevronRight,
  PackageX,
} from 'lucide-react'
import { productsService } from '@/services/productsService'
import { Product, formatPrice } from '@/types/product'
import { BarcodeScannerDialog } from '@/components/products/BarcodeScannerDialog'
import { useToast } from '@/hooks/use-toast'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const [scannerOpen, setScannerOpen] = useState(false)
  const { toast } = useToast()

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await productsService.getProducts(
        page,
        pageSize,
        debouncedSearch,
      )
      setProducts(data)
      setTotalCount(count)
    } catch (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, toast])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleScan = (code: string) => {
    setSearchTerm(code)
    toast({
      title: 'Código escaneado',
      description: `Buscando por: ${code}`,
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de produtos ({totalCount} registros)
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou código de barras..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setScannerOpen(true)}
          title="Escanear Código de Barras"
        >
          <ScanBarcode className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Escanear</span>
        </Button>
      </div>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-4">
          {/* Mobile View - Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {products.map((product) => (
              <Card key={product.CODIGO} className="overflow-hidden">
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
                  {product.GRUPO && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground/80">
                        Grupo:
                      </span>
                      <span>{product.GRUPO}</span>
                    </div>
                  )}
                  {product['DESCRIÇÃO RESUMIDA'] && (
                    <div className="bg-muted p-2 rounded text-xs mt-2">
                      {product['DESCRIÇÃO RESUMIDA']}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden sm:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Cód. Barras</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.CODIGO}>
                    <TableCell className="font-medium">
                      {product.CODIGO}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {product.MERCADORIA}
                        </span>
                        {product['DESCRIÇÃO RESUMIDA'] && (
                          <span className="text-xs text-muted-foreground">
                            {product['DESCRIÇÃO RESUMIDA']}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.GRUPO || '-'}</TableCell>
                    <TableCell>{product['CÓDIGO BARRAS'] || '-'}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPrice(product.PREÇO)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <PackageX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Produto não encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Nenhum produto corresponde à sua busca. Verifique o código ou nome
              digitado.
            </p>
            {searchTerm && (
              <Button
                variant="link"
                onClick={() => setSearchTerm('')}
                className="mt-2"
              >
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
