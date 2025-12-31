import { Button } from '@/components/ui/button'
import { ArrowLeft, Wallet, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function CaixaPage() {
  const { toast } = useToast()

  const handleFechamento = () => {
    toast({
      title: 'Em breve',
      description: 'O módulo de fechamento de caixa está sendo implementado.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caixa</h1>
            <p className="text-muted-foreground">
              Gestão financeira e fechamento.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Operações do Dia
          </CardTitle>
          <CardDescription>
            Realize o fechamento e conferência dos valores diários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleFechamento}
            size="lg"
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            Fechamento de Caixa
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
