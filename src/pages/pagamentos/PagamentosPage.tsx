import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Banknote, Search, RefreshCw, Loader2 } from 'lucide-react'
import { PagamentosTable } from '@/components/pagamentos/PagamentosTable'
import { pagamentosService } from '@/services/pagamentosService'
import { PagamentoRow } from '@/types/pagamentos'
import { useToast } from '@/hooks/use-toast'

export default function PagamentosPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PagamentoRow[]>([])
  const [filteredData, setFilteredData] = useState<PagamentoRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await pagamentosService.getPixPayments()
      setData(result)
      setFilteredData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os dados de pagamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data)
      return
    }
    const lower = searchTerm.toLowerCase()
    const filtered = data.filter(
      (row) =>
        row.cliente_nome.toLowerCase().includes(lower) ||
        row.cliente_id.toString().includes(lower) ||
        (row.id_da_femea && row.id_da_femea.toString().includes(lower)),
    )
    setFilteredData(filtered)
  }, [searchTerm, data])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
            <p className="text-muted-foreground">
              Conferência de recebimentos via Pix.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conferência Pagamentos</CardTitle>
          <CardDescription>
            Lista de transações filtradas para conferência (Apenas Pix).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, código ou pedido..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PagamentosTable data={filteredData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
