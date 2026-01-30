import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Mail,
  CalendarClock,
  ShieldCheck,
  Loader2,
  Send,
  Settings,
  Save,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { emailSeguroService } from '@/services/emailSeguroService'
import { supabase } from '@/lib/supabase/client'

export default function EmailSeguroPage() {
  const [loading, setLoading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>()
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user?.email) {
      setCurrentUserEmail(data.user.email)
    }
  }

  const loadConfig = async () => {
    try {
      const email = await emailSeguroService.getRecipientEmail()
      if (email) {
        setRecipientEmail(email)
        setOriginalEmail(email)
      } else {
        setRecipientEmail('')
        setOriginalEmail('')
      }
    } catch (error) {
      console.error('Failed to load email config', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a configuração de e-mail.',
        variant: 'destructive',
      })
    }
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSaveConfig = async () => {
    setEmailError('')

    if (!recipientEmail) {
      setEmailError('O e-mail é obrigatório.')
      return
    }

    if (!validateEmail(recipientEmail)) {
      setEmailError('Por favor, insira um e-mail válido.')
      return
    }

    setSavingConfig(true)
    try {
      await emailSeguroService.updateRecipientEmail(recipientEmail)
      setOriginalEmail(recipientEmail)
      toast({
        title: 'Sucesso',
        description: 'E-mail atualizado com sucesso',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o e-mail. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSendReport = async () => {
    // UI Validation as per Acceptance Criteria
    if (!originalEmail) {
      toast({
        title: 'Configuração ausente',
        description:
          'Por favor, configure e salve um e-mail de destinatário antes de enviar.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await emailSeguroService.sendReport(currentUserEmail)

      // Success Confirmation as per Acceptance Criteria
      toast({
        title: 'Sucesso',
        description: `Relatório enviado com sucesso para ${originalEmail}`,
        className: 'bg-green-600 text-white',
      })
    } catch (error: any) {
      console.error(error)
      // Dynamic Error Messages as per Acceptance Criteria
      const errorMessage =
        error instanceof Error ? error.message : 'Falha desconhecida'

      toast({
        title: 'Erro ao enviar',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-mail Seguro</h1>
          <p className="text-muted-foreground">
            Automação e envio seguro de relatórios de rota.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Configuration Card */}
        <Card className="md:col-span-2 border-indigo-200 bg-indigo-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <Settings className="w-5 h-5" />
              Configuração de Destinatário
            </CardTitle>
            <CardDescription>
              Defina o e-mail que receberá os relatórios automáticos e manuais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="grid w-full gap-2">
                <Label htmlFor="email">E-mail do Destinatário</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  className={emailError ? 'border-red-500' : ''}
                />
                {emailError && (
                  <p className="text-xs text-red-500 font-medium">
                    {emailError}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="w-full sm:w-auto min-w-[120px]"
              >
                {savingConfig ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar e-mail
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-orange-600" />
              Agendamento Automático
            </CardTitle>
            <CardDescription>Configuração do envio diário.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="bg-muted/50 p-4 rounded-md border">
                <p className="text-sm font-medium">
                  Status: <span className="text-green-600">Ativo</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  O relatório "Controle de Rota" é gerado e enviado
                  automaticamente todos os dias às <strong>07:00 AM</strong>.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Destinatário atual:{' '}
                <strong>{originalEmail || 'Não configurado'}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Mail className="w-5 h-5" />
              Envio Manual
            </CardTitle>
            <CardDescription>
              Precisa do relatório agora? Dispare o envio imediatamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!originalEmail && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-200 rounded-md flex items-center gap-2 text-yellow-800 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Configure um destinatário para enviar.
              </div>
            )}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              onClick={handleSendReport}
              // Loading State as per Acceptance Criteria (disabled + spinner)
              disabled={loading || !originalEmail}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Relatório Agora
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {originalEmail ? (
                <>
                  O arquivo CSV será enviado para:{' '}
                  <strong>{originalEmail}</strong>
                </>
              ) : (
                <>Aguardando configuração de e-mail...</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
