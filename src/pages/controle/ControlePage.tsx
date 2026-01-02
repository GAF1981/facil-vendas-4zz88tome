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
import {
  ClipboardList,
  Search,
  RefreshCw,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { ControleTable } from '@/components/controle/ControleTable'
import { controleService, ControleReceipt } from '@/services/controleService'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

export default function ControlePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ControleReceipt[]>([])
  const [filteredData, setFilteredData] = useState<ControleReceipt[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await controleService.getReceipts()
      setData(result)
      setFilteredData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os dados de controle.',
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
        (row.cliente_nome && row.cliente_nome.toLowerCase().includes(lower)) ||
        row.cliente_id.toString().includes(lower) ||
        (row.ID_da_femea && row.ID_da_femea.toString().includes(lower)) ||
        row.forma_pagamento.toLowerCase().includes(lower),
    )
    setFilteredData(filtered)
  }, [searchTerm, data])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-100 text-cyan-700 rounded-lg shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Controle</h1>
            <p className="text-muted-foreground">
              Monitoramento geral de recebimentos e controles.
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
          <CardTitle>Todos os Registros</CardTitle>
          <CardDescription>
            Lista completa de recebimentos registrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por controle, cliente ou forma..."
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
            <ControleTable data={filteredData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
