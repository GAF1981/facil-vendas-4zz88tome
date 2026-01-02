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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { QrCode, RefreshCw, Loader2, Eraser } from 'lucide-react'
import { PixTable } from '@/components/pix/PixTable'
import { PixConferenceDialog } from '@/components/pix/PixConferenceDialog'
import { pixService } from '@/services/pixService'
import { PixReceiptRow, PixFilters } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'

export default function PixPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PixReceiptRow[]>([])
  const [filteredData, setFilteredData] = useState<PixReceiptRow[]>([])
  const [filters, setFilters] = useState<PixFilters>({
    orderId: '',
    name: '',
    bank: 'todos',
    status: 'todos',
  })
  const [selectedReceipt, setSelectedReceipt] = useState<PixReceiptRow | null>(
    null,
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixReceipts()
      setData(result)
      // Apply filters after fetch (or keep current if reloading)
      // We pass the current filter state to applyFilters
      // However, we need to call setFilteredData with the result of applyFilters
      // This is better handled in a useEffect or by calling applyFilters immediately
      // But applyFilters depends on the 'data' state if we pass it, or we can pass result directly
      setFilteredData(applyFiltersLogic(result, filters))
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os recebimentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Extracted logic to use both in useEffect and fetchData
  const applyFiltersLogic = (
    rows: PixReceiptRow[],
    currentFilters: PixFilters,
  ) => {
    let res = [...rows]

    if (currentFilters.orderId) {
      res = res.filter((row) =>
        (row.id_da_femea?.toString() || row.venda_id.toString()).includes(
          currentFilters.orderId,
        ),
      )
    }

    if (currentFilters.name) {
      const lowerName = currentFilters.name.toLowerCase()
      res = res.filter(
        (row) =>
          row.nome_no_pix && row.nome_no_pix.toLowerCase().includes(lowerName),
      )
    }

    if (currentFilters.bank && currentFilters.bank !== 'todos') {
      res = res.filter((row) => row.banco_pix === currentFilters.bank)
    }

    if (currentFilters.status && currentFilters.status !== 'todos') {
      if (currentFilters.status === 'SIM') {
        res = res.filter((row) => !!row.confirmado_por)
      } else if (currentFilters.status === 'NÃO') {
        res = res.filter((row) => !row.confirmado_por)
      }
    }

    return res
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setFilteredData(applyFiltersLogic(data, filters))
  }, [filters, data])

  const handleFilterChange = (key: keyof PixFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ orderId: '', name: '', bank: 'todos', status: 'todos' })
  }

  const handleConfer = (receipt: PixReceiptRow) => {
    setSelectedReceipt(receipt)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Conferência Pix
            </h1>
            <p className="text-muted-foreground">
              Validação e registro de recebimentos via Pix.
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
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Utilize os campos abaixo para filtrar os pagamentos Pix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="orderId">Número do Pedido</Label>
              <Input
                id="orderId"
                placeholder="Ex: 12345"
                value={filters.orderId}
                onChange={(e) => handleFilterChange('orderId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixName">Nome no Pix</Label>
              <Input
                id="pixName"
                placeholder="Ex: Maria Silva"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Banco Pix</Label>
              <Select
                value={filters.bank}
                onValueChange={(v) => handleFilterChange('bank', v)}
              >
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BS2">BS2</SelectItem>
                  <SelectItem value="CORA">CORA</SelectItem>
                  <SelectItem value="OUTROS">OUTROS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Conferido</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => handleFilterChange('status', v)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="SIM">SIM</SelectItem>
                  <SelectItem value="NÃO">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              onClick={clearFilters}
              className="w-full"
            >
              <Eraser className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>

          {loading && data.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PixTable data={filteredData} onConfer={handleConfer} />
          )}
        </CardContent>
      </Card>

      <PixConferenceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        receipt={selectedReceipt}
        onSuccess={fetchData}
      />
    </div>
  )
}
