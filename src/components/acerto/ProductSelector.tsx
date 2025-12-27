import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Loader2, Plus, Barcode } from 'lucide-react'
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface ProductSelectorProps {
  onSelect: (product: ProductRow) => void
}

export function ProductSelector({ onSelect }: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        handleSearch(searchTerm)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, open])

  const handleSearch = async (term: string) => {
    setLoading(true)
    try {
      // Fetch products (limit 20 for performance in selector)
      const { data } = await productsService.getProducts(1, 20, term)
      setProducts(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao buscar produtos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (product: ProductRow) => {
    onSelect(product)
    setOpen(false)
    setSearchTerm('')
    setProducts([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Inserir Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Selecionar Produto</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou barras..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'Nenhum produto encontrado.'
                : 'Digite para buscar.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="w-[80px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.ID} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {product.ID}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.PRODUTO}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {product['CÓDIGO BARRAS'] && (
                            <span className="flex items-center">
                              <Barcode className="h-3 w-3 mr-1" />
                              {product['CÓDIGO BARRAS']}
                            </span>
                          )}
                          {product.TIPO && <span>({product.TIPO})</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.PREÇO
                        ? `R$ ${product.PREÇO.replace('.', ',')}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSelect(product)}
                      >
                        Selecionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
