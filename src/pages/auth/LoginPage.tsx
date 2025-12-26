import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginFormData, loginSchema } from '@/types/employee'
import { authService } from '@/services/authService'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { setEmployee } = useUserStore()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    const email = data.email.toLowerCase().trim()

    try {
      // 1. Verify credentials against FUNCIONARIOS table first (Business Rule)
      // This validates the 4-digit PIN/Password
      const employee = await authService.verifyCredentials(email, data.password)

      if (!employee) {
        throw new Error('Email ou senha incorretos.')
      }

      // 2. If valid in FUNCIONARIOS, establish Supabase Auth Session
      // We use a deterministic "Shadow Password" because Supabase Auth requires min 6 chars,
      // but our business rule is 4 digits. The user never sees this password.
      // This decouples the "Business Access" (PIN) from "Session Access" (Auth Provider).
      const shadowPassword = `fv-auth-${email}-secure-access`

      // Try to sign in with the shadow password
      let { error: authError } = await signIn(email, shadowPassword)

      // If sign in fails, it might be because the user doesn't exist in Auth Provider yet
      if (authError) {
        if (
          authError.message.includes('Invalid login credentials') ||
          authError.message.includes('not found')
        ) {
          // Attempt to register the user transparently
          const { error: signUpError } = await signUp(email, shadowPassword)

          if (signUpError) {
            // If signup fails but verifyCredentials passed, we have a sync issue
            console.error('Auto-signup failed:', signUpError)

            // If error is "User already registered", it means the password didn't match (shadow password changed?)
            // In a real app we'd need a reset flow, but for this closed system we assume consistency.
            if (signUpError.message.includes('already registered')) {
              throw new Error(
                'Erro de sincronização de credenciais. Contate o suporte.',
              )
            }

            throw new Error('Erro ao criar sessão segura.')
          }

          // Signup successful, try sign in again to ensure session is active
          // (Sometimes signUp doesn't auto-login depending on config)
          const { error: retryError } = await signIn(email, shadowPassword)
          if (retryError) throw retryError
        } else {
          // Real error (network, ban, etc)
          throw authError
        }
      }

      // 3. Success - Store employee data and redirect
      setEmployee(employee)

      toast({
        title: 'Bem-vindo(a)',
        description: `Login realizado com sucesso. Olá, ${employee.nome_completo}!`,
      })

      // Small delay to ensure state is propagated
      setTimeout(() => {
        navigate('/dashboard')
      }, 100)
    } catch (error: any) {
      console.error('Login error:', error)
      let message = error.message || 'Ocorreu um erro ao tentar entrar.'

      if (message.includes('Email not confirmed')) {
        message =
          'Seu email ainda não foi confirmado. Verifique sua caixa de entrada.'
      }

      toast({
        title: 'Erro de acesso',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary animate-fade-in-up">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            FACIL VENDAS
          </CardTitle>
          <CardDescription>
            Entre com suas credenciais de funcionário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário (Email)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="seu@email.com"
                          className="pl-9"
                          {...field}
                          autoComplete="email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha (4 dígitos)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••"
                          maxLength={4}
                          className="pl-9 tracking-widest font-mono"
                          {...field}
                          onChange={(e) => {
                            // Ensure only numbers
                            const value = e.target.value.replace(/\D/g, '')
                            field.onChange(value)
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando acesso...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
          <p>Acesso restrito a funcionários autorizados.</p>
          <p>© 2025 Facil Vendas v1.0.1</p>
        </CardFooter>
      </Card>
    </div>
  )
}
