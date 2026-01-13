import { MetricCard } from '@/components/dashboard/MetricCard'
import { Users, UserPlus, ArrowRight, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { clientsService } from '@/services/clientsService'
import { ClientRow } from '@/types/client'
import { ClientForm } from '@/components/clients/ClientForm'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    recentClients: [] as ClientRow[],
  })
  const [loading, setLoading] = useState(true)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  const fetchStats = async () => {
    try {
      const data = await clientsService.getMetrics()
      setStats({
        totalClients: data.totalClients || 0,
        recentClients: data.recentClients || [],
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setStats({
        totalClients: 0,
        recentClients: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:flex">
            <Link to="/clientes/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </div>

      <Collapsible
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        className="space-y-2"
      >
        <Card className="border-l-4 border-l-primary">
          <div className="flex items-center justify-between p-6">
            <div>
              <CardTitle className="text-lg">Cadastro Rápido</CardTitle>
              <CardDescription>
                Cadastre um novo cliente sem sair do painel.
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                {isRegisterOpen ? 'Fechar' : 'Abrir Cadastro'}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="px-6 pb-6 pt-0 border-t pt-6">
              <ClientForm
                onSuccess={() => {
                  fetchStats()
                  setIsRegisterOpen(false)
                }}
              />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 flex items-center justify-center">
              <Loader2 className="animate-spin text-muted-foreground" />
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Total Clientes"
              value={stats.totalClients}
              description="Base total de cadastros"
              icon={Users}
              iconClassName="text-blue-600"
            />
            <MetricCard
              title="Novos Clientes"
              value={
                stats.recentClients ? `+${stats.recentClients.length}` : '+0'
              }
              description="Recentes"
              icon={UserPlus}
              iconClassName="text-green-600"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Clientes Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {(stats.recentClients || []).map((client) => {
                  // Safe handling for potentially null/undefined values
                  const clientName =
                    client['NOME CLIENTE'] || 'Cliente Sem Nome'
                  const clientEmail = client.EMAIL || 'Sem email'
                  const clientCode = client.CODIGO
                    ? client.CODIGO.toString()
                    : '0'

                  return (
                    <div
                      key={client.CODIGO || Math.random()}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={`https://img.usecurling.com/ppl/thumbnail?gender=${Math.random() > 0.5 ? 'male' : 'female'}&seed=${clientCode}`}
                            alt={clientName}
                          />
                          <AvatarFallback>
                            {clientName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {clientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {clientEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/clientes/${clientCode}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {(!stats.recentClients || stats.recentClients.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhum cliente recente encontrado.
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/clientes">Ver todos os clientes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
