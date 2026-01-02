import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, RefreshCw, Loader2, ArrowLeft } from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'
import { inventarioService } from '@/services/inventarioService'
import { InventarioItem } from '@/types/inventario'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

export default function InventarioPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventarioItem[]>([])
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await inventarioService.getInventory()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os dados de inventário.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 text-violet-700 rounded-lg shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
            <p className="text-muted-foreground">
              Visão geral do estoque, movimentações e conferência.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estoque do Carro</CardTitle>
          <CardDescription>
            Acompanhamento detalhado de entradas, saídas e saldo final.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <InventarioTable data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
