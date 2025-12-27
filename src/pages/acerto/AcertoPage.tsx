import { useState, useEffect } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Calendar, Clock, Save, ArrowLeft, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { clientsService } from '@/services/clientsService'
import { acertoService } from '@/services/acertoService'
import { ClientRow } from '@/types/client'
import { ProductRow } from '@/types/product'
import { AcertoItem } from '@/types/acerto'
import { useToast } from '@/hooks/use-toast'
import { ProductSelector } from '@/components/acerto/ProductSelector'
import { AcertoTable } from '@/components/acerto/AcertoTable'

export default function AcertoPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  // State
  const [clientCode, setClientCode] = useState('')
  const [client, setClient] = useState<ClientRow | null>(null)
  const [loadingClient, setLoadingClient] = useState(false)
  const [lastAcertoDate, setLastAcertoDate] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [items, setItems] = useState<AcertoItem[]>([])
  const [saving, setSaving] = useState(false)

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch Client
  const handleClientSearch = async () => {
    if (!clientCode) return

    setLoadingClient(true)
    setClient(null)
    setLastAcertoDate(null)

    try {
      const data = await clientsService.getById(Number(clientCode))
      if (data) {
        setClient(data)
        // Fetch last acerto
        const lastDate = await acertoService.getLastAcertoDate(data.CODIGO)
        setLastAcertoDate(lastDate)
      } else {
        toast({
          title: 'Cliente não encontrado',
          description: 'Verifique o código e tente novamente.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao buscar cliente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingClient(false)
    }
  }

  // Handle Enter key in client input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleClientSearch()
    }
  }

  // Add Product
  const handleAddProduct = (product: ProductRow) => {
    // Check if exists
    if (items.some((i) => i.produtoId === product.ID)) {
      toast({
        title: 'Produto já adicionado',
        description: 'Este produto já está na lista.',
        variant: 'destructive',
      })
      return
    }

    const price = product.PREÇO
      ? parseFloat(product.PREÇO.replace(',', '.'))
      : 0
    const saldoInicial = 0 // Defaults to 0 as per user story

    const newItem: AcertoItem = {
      uid: Math.random().toString(36).substr(2, 9),
      produtoId: product.ID,
      produtoNome: product.PRODUTO || 'Sem nome',
      tipo: product.TIPO || '',
      precoUnitario: price,
      saldoInicial: saldoInicial,
      contagem: 0,
      quantVendida: saldoInicial - 0, // 0 - 0 = 0
      valorVendido: 0,
      saldoFinal: 0, // Reflects count
    }

    setItems((prev) => [...prev, newItem])
  }

  // Update Count Logic
  const handleUpdateCount = (uid: string, newCount: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        const quantVendida = item.saldoInicial - newCount
        const valorVendido = quantVendida * item.precoUnitario
        const saldoFinal = newCount // Saldo final reflects count

        return {
          ...item,
          contagem: newCount,
          quantVendida,
          valorVendido,
          saldoFinal,
        }
      }),
    )
  }

  // Remove Item
  const handleRemoveItem = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }

  // Save Acerto
  const handleSave = async () => {
    if (!client || !employee) {
      toast({
        title: 'Dados incompletos',
        description: 'Verifique cliente e funcionário.',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Lista vazia',
        description: 'Adicione produtos antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const total = items.reduce((acc, item) => acc + item.valorVendido, 0)

      await acertoService.saveAcerto({
        clienteId: client.CODIGO,
        funcionarioId: employee.id,
        valorTotal: total,
        dataAcerto: new Date().toISOString(),
        itens: items,
        observacoes: 'Acerto realizado via App',
      })

      toast({
        title: 'Sucesso',
        description: 'Acerto registrado com sucesso!',
        className: 'bg-green-50 border-green-200 text-green-900',
      })

      // Reset or Navigate
      setItems([])
      setClient(null)
      setClientCode('')
      setLastAcertoDate(null)
      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar o acerto.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Acerto de Cliente
            </h1>
            <p className="text-muted-foreground">
              Controle de estoque e vendas por cliente.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {format(currentTime, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">Funcionário:</span>
            <span className="font-mono bg-background px-2 py-1 rounded border">
              {employee?.id || '---'}
            </span>
            <span className="font-medium">
              {employee?.nome_completo || 'Não identificado'}
            </span>
          </div>
          {lastAcertoDate && (
            <div className="text-sm">
              <span className="font-semibold text-muted-foreground mr-2">
                Último Acerto:
              </span>
              <span>
                {format(new Date(lastAcertoDate), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Selection */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 w-full max-w-[200px]">
              <Label htmlFor="clientCode">Código do Cliente</Label>
              <div className="flex gap-2">
                <Input
                  id="clientCode"
                  placeholder="Cód."
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="font-mono"
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleClientSearch}
                  disabled={loadingClient}
                >
                  {loadingClient ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {client && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="font-medium truncate">
                    {client['NOME CLIENTE']}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Endereço
                  </Label>
                  <p className="font-medium truncate">
                    {client.ENDEREÇO || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Cidade
                  </Label>
                  <p className="font-medium truncate">
                    {client.MUNICÍPIO || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Bairro
                  </Label>
                  <p className="font-medium truncate">{client.BAIRRO || '-'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Resumo da Contagem
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({items.length} itens)
            </span>
          </h2>
          <ProductSelector onSelect={handleAddProduct} />
        </div>

        <AcertoTable
          items={items}
          onUpdateCount={handleUpdateCount}
          onRemoveItem={handleRemoveItem}
        />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
          <div className="text-sm text-muted-foreground">
            * Saldo Inicial padrão é 0 para novos itens nesta sessão.
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Valor Total Vendido
              </p>
              <p className="text-2xl font-bold text-green-600">
                R${' '}
                {items
                  .reduce((acc, item) => acc + item.valorVendido, 0)
                  .toFixed(2)
                  .replace('.', ',')}
              </p>
            </div>
            <Separator
              orientation="vertical"
              className="h-10 hidden sm:block"
            />
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleSave}
              disabled={saving || items.length === 0 || !client}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Finalizar Acerto
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
