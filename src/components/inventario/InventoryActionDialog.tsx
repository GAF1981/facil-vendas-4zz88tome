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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { productsService } from '@/services/productsService'
import { suppliersService, Supplier } from '@/services/suppliersService'
import { ProductRow } from '@/types/product'
import { useToast } from '@/hooks/use-toast'

interface InventoryActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => Promise<void>
  type: 'COMPRA' | 'ENTRADA' | 'SAIDA' | 'PERDA'
  title: string
}

export function InventoryActionDialog({
  open,
  onOpenChange,
  onSave,
  type,
  title,
}: InventoryActionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSaving] = useState(false)
  const { toast } = useToast()

  // Data Sources
  const [products, setProducts] = useState<ProductRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Form State
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [costValue, setCostValue] = useState<string>('')
  const [observation, setObservation] = useState<string>('')

  useEffect(() => {
    if (open) {
      // Load products
      setLoading(true)
      productsService.getProducts(1, 10000).then(({ data }) => {
        setProducts(data || [])
        setLoading(false)
      })

      // Load suppliers only for Purchase
      if (type === 'COMPRA') {
        suppliersService.getAll().then(setSuppliers)
      }

      // Reset form
      setSelectedProduct('')
      setSelectedSupplier('')
      setQuantity('')
      setCostValue('')
      setObservation('')
    }
  }, [open, type])

  const handleProductChange = (prodId: string) => {
    setSelectedProduct(prodId)

    // Auto-calculate cost for purchases: 30% of Sale Price
    if (type === 'COMPRA' && prodId) {
      const prod = products.find((p) => p.ID.toString() === prodId)
      if (prod && prod.PREÇO) {
        const salePrice = parseCurrency(prod.PREÇO)
        const calculatedCost = salePrice * 0.3
        setCostValue(formatCurrency(calculatedCost))
      }
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!selectedProduct) {
      toast({
        title: 'Erro',
        description: 'Selecione um produto.',
        variant: 'destructive',
      })
      return
    }
    if (!quantity || Number(quantity) <= 0) {
      toast({
        title: 'Erro',
        description: 'Informe uma quantidade válida.',
        variant: 'destructive',
      })
      return
    }

    if (type === 'COMPRA') {
      if (!selectedSupplier) {
        toast({
          title: 'Erro',
          description: 'Fornecedor é obrigatório para compras.',
          variant: 'destructive',
        })
        return
      }
      if (!costValue) {
        toast({
          title: 'Erro',
          description: 'Valor de custo é obrigatório.',
          variant: 'destructive',
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload: any = {
        produto_id: parseInt(selectedProduct),
        quantidade: parseInt(quantity),
        tipo: type,
        observacao: observation,
      }

      if (type === 'COMPRA') {
        payload.fornecedor_id = parseInt(selectedSupplier)
        payload.valor_unitario = parseCurrency(costValue)
      }

      await onSave(payload)
      onOpenChange(false)
      toast({ title: 'Sucesso', description: 'Movimentação registrada.' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar movimentação.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              Produto <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedProduct}
              onValueChange={handleProductChange}
              disabled={loading || submitting}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading ? 'Carregando...' : 'Selecione o produto'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.ID} value={p.ID.toString()}>
                    {p.PRODUTO}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'COMPRA' && (
            <div className="space-y-2">
              <Label>
                Fornecedor <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedSupplier}
                onValueChange={setSelectedSupplier}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nome_fornecedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                disabled={submitting}
              />
            </div>

            {type === 'COMPRA' && (
              <div className="space-y-2">
                <Label>
                  Valor Custo (Unit.) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={costValue}
                  onChange={(e) => setCostValue(e.target.value)}
                  placeholder="0,00"
                  disabled={submitting}
                />
                <p className="text-[10px] text-muted-foreground">
                  Calculado: 30% do preço de venda
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Detalhes adicionais..."
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
