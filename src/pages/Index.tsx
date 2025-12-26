import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import { MobileNavCard } from '@/components/home/MobileNavCard'
import { LayoutDashboard, Users, ShoppingCart } from 'lucide-react'

const Index = () => {
  const navigate = useNavigate()
  // Use a reliable way to detect mobile on initial render or layout effect
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // If definitely not mobile (desktop), redirect to dashboard
    if (isMobile === false) {
      navigate('/dashboard', { replace: true })
    }
  }, [isMobile, navigate])

  // While checking, render nothing or a shell to avoid flicker
  if (isMobile === null) {
    return null
  }

  // If Desktop, we are redirecting (handled by effect), but return null here to avoid rendering Hub briefly
  if (isMobile === false) {
    return null
  }

  // Mobile View - Navigation Hub
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col items-center justify-center py-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          FACIL VENDAS
        </h1>
        <p className="text-muted-foreground text-center max-w-xs">
          Bem-vindo ao seu painel de controle móvel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2">
        <MobileNavCard
          title="Dashboard"
          description="Visão geral e métricas"
          icon={LayoutDashboard}
          to="/dashboard"
          iconColor="text-blue-600"
        />
        <MobileNavCard
          title="Clientes"
          description="Gerenciar base de clientes"
          icon={Users}
          to="/clientes"
          iconColor="text-green-600"
        />
        <MobileNavCard
          title="Vendas"
          description="Pedidos e faturamento"
          icon={ShoppingCart}
          to="/vendas"
          iconColor="text-purple-600"
        />
      </div>
    </div>
  )
}

export default Index
