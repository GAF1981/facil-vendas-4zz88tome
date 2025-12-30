import { Button } from '@/components/ui/button'
import { ArrowLeft, Construction } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SalesReportsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/relatorio')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório de Vendas
          </h1>
          <p className="text-muted-foreground">
            Análise detalhada de vendas e faturamento.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-lg bg-muted/10 border-dashed">
        <div className="bg-muted p-4 rounded-full mb-4">
          <Construction className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Em Desenvolvimento</h3>
        <p className="text-muted-foreground max-w-md text-center">
          Este módulo de relatório está sendo preparado. Em breve você poderá
          visualizar gráficos e métricas detalhadas de vendas aqui.
        </p>
      </div>
    </div>
  )
}
