import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cobrancaService } from '@/services/cobrancaService'
import { CollectionAction, CollectionInstallment } from '@/types/cobranca'
import { useToast } from '@/hooks/use-toast'
import { format, parseISO } from 'date-fns'
import {
  Loader2,
  Plus,
  CalendarIcon,
  UserIcon,
  History,
  Trash2,
} from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'
import { formatCurrency } from '@/lib/formatters'

interface CollectionActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  clientName: string
  clientId: number
  onActionAdded: () => void
}

export function CollectionActionsSheet({
  isOpen,
  onClose,
  orderId,
  clientName,
  clientId,
  onActionAdded,
}: CollectionActionsSheetProps) {
  const [actions, setActions] = useState<CollectionAction[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  // Form State
  const [newAction, setNewAction] = useState({
    acao: '',
    dataAcao: format(new Date(), 'yyyy-MM-dd'),
  })

  // Installments State for Form
  const [installments, setInstallments] = useState<CollectionInstallment[]>([])

  const fetchActions = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const data = await cobrancaService.getCollectionActions(orderId)
      setActions(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de cobrança.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchActions()
      setShowForm(false)
      setNewAction({
        acao: '',
        dataAcao: format(new Date(), 'yyyy-MM-dd'),
      })
      setInstallments([])
    }
  }, [isOpen, orderId])

  const addInstallment = () => {
    if (installments.length >= 12) {
      toast({
        title: 'Limite atingido',
        description: 'Máximo de 12 parcelas permitidas.',
        variant: 'destructive',
      })
      return
    }
    setInstallments([
      ...installments,
      {
        vencimento: format(new Date(), 'yyyy-MM-dd'),
        valor: 0,
        forma_pagamento: 'PIX',
      },
    ])
  }

  const removeInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index))
  }

  const updateInstallment = (
    index: number,
    field: keyof CollectionInstallment,
    value: any,
  ) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    setInstallments(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para adicionar uma ação.',
        variant: 'destructive',
      })
      return
    }

    if (!newAction.acao.trim()) {
      toast({
        title: 'Atenção',
        description: 'Descreva a ação realizada.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Determine "Nova Data Combinada" as the earliest installment date if exists, or null
      let novaDataCombinada: string | null = null
      if (installments.length > 0) {
        // Find earliest date
        const sortedDates = [...installments].sort(
          (a, b) =>
            new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime(),
        )
        novaDataCombinada = sortedDates[0].vencimento
      }

      await cobrancaService.addCollectionAction({
        acao: newAction.acao,
        dataAcao: newAction.dataAcao,
        novaDataCombinada: novaDataCombinada,
        funcionarioId: employee.id,
        funcionarioNome: employee.nome_completo,
        pedidoId: Number(orderId),
        clienteId: clientId,
        clienteNome: clientName,
        installments: installments,
      })

      toast({
        title: 'Sucesso',
        description: 'Ação de cobrança registrada.',
        variant: 'default',
        className: 'bg-green-600 text-white',
      })

      await fetchActions()
      setShowForm(false)
      onActionAdded()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a ação. Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Ações de Cobrança
          </SheetTitle>
          <SheetDescription>
            Histórico para o Pedido <strong>#{orderId}</strong> - {clientName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!showForm && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Ação
              </Button>
            </div>
          )}

          {showForm && (
            <div className="bg-muted/30 p-4 rounded-lg border space-y-4 animate-in slide-in-from-top-4 fade-in overflow-y-auto max-h-[60vh]">
              <h3 className="text-sm font-semibold">Registrar Nova Ação</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="acao">Descrição da Ação</Label>
                  <Textarea
                    id="acao"
                    placeholder="Ex: Negociado pagamento parcelado..."
                    value={newAction.acao}
                    onChange={(e) =>
                      setNewAction({ ...newAction, acao: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dataAcao">Data da Ação</Label>
                  <Input
                    id="dataAcao"
                    type="date"
                    value={newAction.dataAcao}
                    onChange={(e) =>
                      setNewAction({ ...newAction, dataAcao: e.target.value })
                    }
                  />
                </div>

                {/* Dynamic Installments */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <Label>Nova Previsão de Pagamento (Parcelas)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInstallment}
                      className="h-6 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>

                  {installments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma parcela definida.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {installments.map((inst, idx) => (
                        <div
                          key={idx}
                          className="flex items-end gap-2 bg-white p-2 rounded border"
                        >
                          <div className="grid gap-1 flex-1">
                            <span className="text-[10px] text-muted-foreground">
                              Data
                            </span>
                            <Input
                              type="date"
                              className="h-7 text-xs px-1"
                              value={inst.vencimento}
                              onChange={(e) =>
                                updateInstallment(
                                  idx,
                                  'vencimento',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="grid gap-1 w-20">
                            <span className="text-[10px] text-muted-foreground">
                              Valor
                            </span>
                            <Input
                              type="number"
                              className="h-7 text-xs px-1"
                              placeholder="0.00"
                              value={inst.valor}
                              onChange={(e) =>
                                updateInstallment(
                                  idx,
                                  'valor',
                                  Number(e.target.value),
                                )
                              }
                            />
                          </div>
                          <div className="grid gap-1 w-24">
                            <span className="text-[10px] text-muted-foreground">
                              Forma
                            </span>
                            <Select
                              value={inst.forma_pagamento}
                              onValueChange={(val) =>
                                updateInstallment(idx, 'forma_pagamento', val)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs px-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PIX">PIX</SelectItem>
                                <SelectItem value="DINHEIRO">
                                  DINHEIRO
                                </SelectItem>
                                <SelectItem value="BOLETO">BOLETO</SelectItem>
                                <SelectItem value="CARTAO">CARTAO</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => removeInstallment(idx)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="flex-1 min-h-0 border rounded-md">
            <ScrollArea className="h-full p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma ação registrada para este pedido.
                </div>
              ) : (
                <div className="space-y-4">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="border rounded-lg p-3 text-sm space-y-2 bg-card shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <CalendarIcon className="w-3 h-3" />
                          {action.dataAcao
                            ? format(parseISO(action.dataAcao), 'dd/MM/yyyy')
                            : '-'}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <UserIcon className="w-3 h-3" />
                          {action.funcionarioNome || 'Sistema'}
                        </div>
                      </div>
                      <div className="font-medium whitespace-pre-wrap">
                        {action.acao}
                      </div>
                      {/* Show Installments Details */}
                      {action.installments && action.installments.length > 0 ? (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Novo Acordo:
                          </p>
                          <div className="space-y-1">
                            {action.installments.map((inst, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs bg-muted/30 p-1 rounded"
                              >
                                <span>
                                  {format(parseISO(inst.vencimento), 'dd/MM')}
                                </span>
                                <span>{inst.forma_pagamento}</span>
                                <span className="font-medium text-green-600">
                                  R$ {formatCurrency(inst.valor)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        action.novaDataCombinada && (
                          <div className="text-xs pt-1 border-t mt-1 flex gap-2">
                            <span className="text-muted-foreground">
                              Nova Previsão:
                            </span>
                            <span className="font-semibold text-blue-600">
                              {format(
                                parseISO(action.novaDataCombinada),
                                'dd/MM/yyyy',
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
