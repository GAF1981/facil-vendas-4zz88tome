import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { productsService } from '@/services/productsService'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { ProductRow } from '@/types/product'
import { Loader2, Search, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProductSelectorTable } from '@/components/acerto/ProductSelectorTable'
import { useUserStore } from '@/stores/useUserStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  onSuccess?: () => void
  preselectedProduct?: {
    id: number
    codigo: number | null
    produto: string
  } | null
}

export function EstoqueCarroCountDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
  preselectedProduct,
}: Props) {
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  useEffect(() => {
    if (open) {
      if (preselectedProduct) {
        // Adapt preselected simple object to ProductRow structure for local state
        // We only need ID, CODIGO, PRODUTO for display/logic mostly
        setSelectedProduct({
          ID: preselectedProduct.id,
          CODIGO: preselectedProduct.codigo,
          PRODUTO: preselectedProduct.produto,
        } as ProductRow)
        setStep(2)
        setQuantity('')
      } else {
        setStep(1)
        setSearchTerm('')
        setProducts([])
        setSelectedProduct(null)
        setQuantity('')
      }
    }
  }, [open, preselectedProduct])

  const handleSearch = async (term: string) => {
    if (!term) return
    setLoading(true)
    try {
      const { data } = await productsService.getProducts(1, 20, term)
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (p: ProductRow) => {
    setSelectedProduct(p)
    setStep(2)
  }

  const handleSave = async () => {
    if (!selectedProduct || !quantity) return
    setLoading(true)
    try {
      await estoqueCarroService.saveCount(
        sessionId,
        selectedProduct.ID,
        parseInt(quantity),
        employee?.id,
        employee?.nome_completo,
      )
      toast({ title: 'Contagem Salva' })

      if (onSuccess) onSuccess()

      // Reset for next count
      if (preselectedProduct) {
        // If we opened for a specific product, close after save
        onOpenChange(false)
      } else {
        // If manual flow, reset to step 1
        setStep(1)
        setQuantity('')
        setSelectedProduct(null)
        setProducts([])
        setSearchTerm('')
      }
    } catch (e: any) {
      console.error(e)
      toast({
        title: 'Erro ao salvar',
        description: e.message || 'Falha ao salvar contagem.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contagem Carro</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (e.target.value.length > 2) handleSearch(e.target.value)
                  }}
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                title="Scan Barcode (Placeholder)"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              <ProductSelectorTable
                products={products}
                loading={loading}
                searchTerm={searchTerm}
                selectedIds={new Set()}
                onSelect={handleSelect}
                onToggleSelect={() => {}}
                onToggleSelectAll={() => {}}
              />
            </div>
          </div>
        )}

        {step === 2 && selectedProduct && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded">
              <p className="font-bold">{selectedProduct.PRODUTO}</p>
              <p className="text-sm">Cod: {selectedProduct.CODIGO}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade Contada</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (preselectedProduct) {
                    onOpenChange(false)
                  } else {
                    setStep(1)
                  }
                }}
              >
                {preselectedProduct ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
