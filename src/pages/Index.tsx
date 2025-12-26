import { MetricCard } from '@/components/dashboard/MetricCard'
import { useClientStore } from '@/stores/useClientStore'
import {
  Users,
  UserPlus,
  ShoppingCart,
  DollarSign,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const Index = () => {
  const { clients } = useClientStore()

  // Calculate stats
  const totalClients = clients.length
  const newClients = clients.filter((c) => {
    const date = new Date(c.createdAt)
    const now = new Date()
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  }).length

  const recentClients = [...clients]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5)

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Clientes"
          value={totalClients}
          description="Base total de cadastros"
          icon={Users}
          iconClassName="text-blue-600"
        />
        <MetricCard
          title="Novos Clientes"
          value={`+${newClients}`}
          description="Neste mês"
          icon={UserPlus}
          iconClassName="text-green-600"
        />
        <MetricCard
          title="Vendas Realizadas"
          value="142"
          description="+12% que o mês anterior"
          icon={ShoppingCart}
          iconClassName="text-purple-600"
        />
        <MetricCard
          title="Faturamento Total"
          value="R$ 45.231,89"
          description="+8% que o mês anterior"
          icon={DollarSign}
          iconClassName="text-orange-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle>Clientes Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?gender=${Math.random() > 0.5 ? 'male' : 'female'}&seed=${client.id}`}
                        alt={client.name}
                      />
                      <AvatarFallback>
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {client.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        client.status === 'active' ? 'default' : 'secondary'
                      }
                      className={
                        client.status === 'active'
                          ? 'bg-green-500 hover:bg-green-600'
                          : ''
                      }
                    >
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/clientes/${client.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/clientes">Ver todos os clientes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhuma venda registrada hoje.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        asChild
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden"
      >
        <Link to="/clientes/novo">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  )
}

export default Index
