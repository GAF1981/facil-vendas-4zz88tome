import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  LifeBuoy,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { backupService } from '@/services/backupService'
import { useUserStore } from '@/stores/useUserStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export default function BackupPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueText, setIssueText] = useState('')
  const [reporting, setReporting] = useState(false)

  const { toast } = useToast()
  const { employee } = useUserStore()

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await backupService.getStats()
      setStats(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as estatísticas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleExportCSV = async (table: string, label: string) => {
    setExporting(table)
    try {
      const success = await backupService.exportTableToCSV(table, label)
      if (success) {
        toast({
          title: 'Download Iniciado',
          description: `Arquivo CSV de ${label} gerado com sucesso.`,
          className: 'bg-green-600 text-white',
        })
      } else {
        toast({
          title: 'Arquivo Vazio',
          description: `Não há dados para exportar em ${label}.`,
          variant: 'warning',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na Exportação',
        description: `Falha ao exportar ${label}.`,
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const handleFullBackup = async () => {
    setExporting('FULL')
    try {
      await backupService.generateFullBackup()
      toast({
        title: 'Backup Completo',
        description: 'Snapshot do banco de dados baixado com sucesso.',
        className: 'bg-blue-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro no Backup',
        description: 'Falha ao gerar o backup completo.',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const handleReportIssue = async () => {
    if (!issueText.trim()) return
    if (!employee) return

    setReporting(true)
    try {
      await backupService.reportIssue(
        issueText,
        employee.id,
        'download_failure',
      )
      toast({
        title: 'Relatório Enviado',
        description: 'Nossa equipe técnica analisará o problema.',
        className: 'bg-green-600 text-white',
      })
      setIssueText('')
      setIssueDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Erro no Envio',
        description: 'Não foi possível enviar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setReporting(false)
    }
  }

  const exportOptions = [
    {
      table: 'CLIENTES',
      label: 'Clientes',
      desc: 'Cadastro completo de clientes',
      countKey: 'CLIENTES',
    },
    {
      table: 'BANCO_DE_DADOS',
      label: 'Vendas e Acertos',
      desc: 'Histórico de transações financeiras',
      countKey: 'BANCO_DE_DADOS',
    },
    {
      table: 'ROTA_ITEMS',
      label: 'Itens de Rota',
      desc: 'Definições de rotas e clientes',
      countKey: 'ROTA_ITEMS',
    },
    {
      table: 'PENDENCIAS',
      label: 'Pendências',
      desc: 'Registro de pendências e resoluções',
      countKey: 'PENDENCIAS',
    },
    {
      table: 'FUNCIONARIOS',
      label: 'Funcionários',
      desc: 'Cadastro da equipe',
      countKey: 'FUNCIONARIOS',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Backup e Exportação
            </h1>
            <p className="text-muted-foreground">
              Central de segurança e portabilidade de dados (Premium).
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadStats} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar Dados
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Full Backup Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <ShieldCheck className="h-5 w-5" />
              Backup Completo
            </CardTitle>
            <CardDescription>
              Baixe todos os dados da sua empresa em um único arquivo JSON
              estruturado. Ideal para migração ou cópia de segurança offline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Inclui: Clientes, Vendas, Produtos, Rotas, Funcionários e Logs.
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleFullBackup}
              disabled={!!exporting}
            >
              {exporting === 'FULL' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="mr-2 h-4 w-4" />
              )}
              Download Backup Completo (JSON)
            </Button>
          </CardContent>
        </Card>

        {/* Premium Support Card */}
        <Card className="col-span-1 md:col-span-2 border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <LifeBuoy className="h-5 w-5" />
              Suporte ao Código Fonte (Premium)
            </CardTitle>
            <CardDescription>
              Está com problemas para baixar o código fonte ou exportar dados?
              Reporte diretamente para nossa equipe de engenharia.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Utilize esta ferramenta caso o ícone de download da plataforma
              Skip não esteja respondendo ou apresente erros.
            </div>
            <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 whitespace-nowrap"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Reportar Falha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reportar Problema Técnico</DialogTitle>
                  <DialogDescription>
                    Descreva o problema encontrado com a exportação ou download
                    do código.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="issue">Descrição do Erro</Label>
                    <Textarea
                      id="issue"
                      placeholder="Ex: O botão de download do código fonte não reage ao clique..."
                      value={issueText}
                      onChange={(e) => setIssueText(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIssueDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleReportIssue}
                    disabled={reporting || !issueText.trim()}
                  >
                    {reporting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enviar Relatório
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* CSV Export Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportação CSV (Planilhas)
          </CardTitle>
          <CardDescription>
            Exporte tabelas individuais para análise em Excel ou Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tabela de Dados</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportOptions.map((opt) => (
                <TableRow key={opt.table}>
                  <TableCell className="font-medium">{opt.label}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {opt.desc}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stats ? (
                      stats[opt.countKey] !== undefined ? (
                        stats[opt.countKey]
                      ) : (
                        '-'
                      )
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCSV(opt.table, opt.label)}
                      disabled={!!exporting}
                    >
                      {exporting === opt.table ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-3 w-3" />
                      )}
                      CSV
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
