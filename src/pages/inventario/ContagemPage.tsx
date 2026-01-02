import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Save, Loader2, Package, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { productsService } from '@/services/productsService'
import { inventarioService } from '@/services/inventarioService'
import { ProductRow } from '@/types/product'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUserStore } from '@/stores/useUserStore'

export default function ContagemPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const { toast } = useToast()
  const navigate = useNavigate()
  // Assuming counting is done for the context of the user if they are an employee,
  // or generally if they are admin. For now, we will try to match the active session context.
  const [activeSession, setActiveSession] = useState<any>(null)

  useEffect(() => {
    // Check for active session to know context
    inventarioService
      .getActiveSession()
      .then((session) => {
        setActiveSession(session)
      })
      .catch((err) => console.error('Error fetching session', err))
  }, [])

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length > 1) {
        handleSearch()
      } else if (searchTerm.length === 0) {
        setProducts([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const { data } = await productsService.getProducts(1, 20, searchTerm)
      setProducts(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar produtos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCountChange = (productId: number, value: string) => {
    setCounts((prev) => ({
      ...prev,
      [productId]: parseInt(value) || 0,
    }))
  }

  const handleSaveCount = async (product: ProductRow) => {
    const count = counts[product.ID]
    if (count === undefined) return

    setSavingId(product.ID)
    try {
      const targetEmployeeId = activeSession?.['CODIGO FUNCIONARIO'] || null
      // We assume updating the count on the latest record
      await inventarioService.updateItemCount(
        product.CODIGO!,
        count,
        targetEmployeeId,
      )

      toast({
        title: 'Contagem Salva',
        description: `Produto: ${product.PRODUTO} | Quantidade: ${count}`,
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description:
          'Não foi possível atualizar a contagem. Verifique se existe histórico para este produto.',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleInsertMercadoria = () => {
    // If "Inserir Mercadoria" implies adding a product to the catalog
    navigate('/produtos/novo')
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/inventario">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Fazer Contagem
            </h1>
            <p className="text-muted-foreground">
              {activeSession
                ? `Contagem para sessão #${activeSession['ID INVENTÁRIO']}`
                : 'Busque produtos e atualize a contagem do estoque.'}
            </p>
          </div>
        </div>
        <Button onClick={handleInsertMercadoria} variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          Inserir Mercadoria (Catálogo)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Produto</CardTitle>
          <CardDescription>
            Digite o nome, código interno ou código de barras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, código ou EAN..."
              className="pl-9 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Cód.</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Barras</TableHead>
                  <TableHead className="w-[150px] text-center">
                    Contagem
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {searchTerm.length > 1
                        ? 'Nenhum produto encontrado.'
                        : 'Digite para buscar produtos.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.ID}>
                      <TableCell className="font-mono">
                        {product.CODIGO || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{product.PRODUTO}</span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {product['CÓDIGO BARRAS']}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {product['CÓDIGO BARRAS'] || '-'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="text-center font-bold"
                          placeholder="0"
                          value={counts[product.ID] ?? ''}
                          onChange={(e) =>
                            handleCountChange(product.ID, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCount(product)
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSaveCount(product)}
                          disabled={
                            savingId === product.ID ||
                            counts[product.ID] === undefined
                          }
                        >
                          {savingId === product.ID ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
