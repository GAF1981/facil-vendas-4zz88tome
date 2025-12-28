import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { clientsService } from '@/services/clientsService'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { ClientRow } from '@/types/client'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { useToast } from '@/hooks/use-toast'

const ClientHistoryPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientRow | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState(0)
  const [lastAcerto, setLastAcerto] = useState<{
    date: string
    time: string
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [clientData, avg, lastAcertoData] = await Promise.all([
          clientsService.getById(Number(id)),
          bancoDeDadosService.getMonthlyAverage(Number(id)),
          bancoDeDadosService.getLastAcerto(Number(id)),
        ])

        setClient(clientData)
        setMonthlyAverage(avg)
        setLastAcerto(lastAcertoData)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do cliente.',
          variant: 'destructive',
        })
        navigate('/clientes')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, navigate, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/clientes')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Histórico Financeiro
          </h1>
          <p className="text-muted-foreground">
            Visualize o histórico de acertos e transações.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <ClientDetails client={client} lastAcerto={lastAcerto} />

        <AcertoHistoryTable
          clientId={client.CODIGO}
          monthlyAverage={monthlyAverage}
        />
      </div>
    </div>
  )
}

export default ClientHistoryPage
