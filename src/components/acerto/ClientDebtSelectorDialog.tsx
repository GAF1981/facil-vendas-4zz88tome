import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Banknote, Calendar, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { CollectionActionsSheet } from '@/components/cobranca/CollectionActionsSheet'

interface ClientDebtSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: number
  clientName: string
}

export function ClientDebtSelectorDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: ClientDebtSelectorDialogProps) {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (open && clientId) {
      fetchDebts()
    }
  }, [open, clientId])

  const fetchDebts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('debitos_historico')
        .select('*')
        .eq('cliente_codigo', clientId)
        .gt('debito', 0.01)
        .order('data_acerto', { ascending: false })

      if (error) throw error
      setDebts(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              Registrar Ação de Cobrança
            </DialogTitle>
            <DialogDescription>
              Selecione um pedido pendente para {clientName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : debts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm p-4 bg-muted/30 rounded-md border border-dashed">
                Nenhum débito pendente encontrado para este cliente.
              </p>
            ) : (
              <div className="space-y-2">
                {debts.map((debt) => (
                  <button
                    key={debt.pedido_id}
                    className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex items-center justify-between group shadow-sm"
                    onClick={() => {
                      setSelectedOrderId(debt.pedido_id.toString())
                      onOpenChange(false)
                    }}
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        Pedido #{debt.pedido_id}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {debt.data_acerto
                          ? format(parseISO(debt.data_acerto), 'dd/MM/yyyy')
                          : '-'}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Valor Pendente
                        </div>
                        <div className="font-bold text-red-600">
                          R$ {formatCurrency(debt.debito)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedOrderId && (
        <CollectionActionsSheet
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          orderId={selectedOrderId}
          clientId={clientId}
          clientName={clientName}
          onActionAdded={() => fetchDebts()}
          defaultShowForm={true}
        />
      )}
    </>
  )
}
