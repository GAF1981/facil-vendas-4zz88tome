import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import { Wallet, CreditCard, Calendar, DollarSign } from 'lucide-react'
import {
  PaymentEntry,
  PaymentMethodType,
  PAYMENT_METHODS,
  PaymentInstallment,
} from '@/types/payment'
import { cn } from '@/lib/utils'
import { addDays, format } from 'date-fns'

interface AcertoPaymentSummaryProps {
  saldoAPagar: number
  payments: PaymentEntry[]
  onPaymentsChange: (payments: PaymentEntry[]) => void
  disabled?: boolean
}

export function AcertoPaymentSummary({
  saldoAPagar,
  payments,
  onPaymentsChange,
  disabled = false,
}: AcertoPaymentSummaryProps) {
  const totalRegistered = payments.reduce((acc, p) => acc + p.value, 0)
  const remaining = saldoAPagar - totalRegistered
  const isComplete = Math.abs(remaining) < 0.01

  const handleToggleMethod = (method: PaymentMethodType, checked: boolean) => {
    if (disabled) return

    if (checked) {
      const defaultValue = Number(Math.max(0, remaining).toFixed(2))
      const today = new Date()
      const dueDateDate = method === 'Boleto' ? addDays(today, 10) : today
      const dueDate = format(dueDateDate, 'yyyy-MM-dd')

      // Auto-fill logic for Cheque (Value = Paid Value)
      const initialPaidValue = method === 'Cheque' ? defaultValue : 0

      const newEntry: PaymentEntry = {
        method,
        value: defaultValue,
        paidValue: initialPaidValue,
        installments: 1,
        dueDate: dueDate,
      }
      onPaymentsChange([...payments, newEntry])
    } else {
      onPaymentsChange(payments.filter((p) => p.method !== method))
    }
  }

  const generateInstallments = (
    totalValue: number,
    count: number,
    method: PaymentMethodType,
  ): PaymentInstallment[] => {
    const installmentValue = Number((totalValue / count).toFixed(2))
    const today = new Date()
    return Array.from({ length: count }, (_, i) => {
      let dueDate = format(addDays(today, (i + 1) * 30), 'yyyy-MM-dd')
      let paidValue = 0

      // Logic for ENTRADA (Index 0 for PIX/Dinheiro)
      if (i === 0 && (method === 'Pix' || method === 'Dinheiro')) {
        dueDate = format(today, 'yyyy-MM-dd')
        paidValue = installmentValue
      }

      // Logic for Cheque installments (Paid Value = Value)
      if (method === 'Cheque') {
        paidValue = installmentValue
      }

      return {
        number: i + 1,
        value: installmentValue,
        paidValue: paidValue,
        dueDate: dueDate,
      }
    })
  }

  const handleUpdateEntry = (
    method: PaymentMethodType,
    field: keyof PaymentEntry,
    value: any,
  ) => {
    if (disabled) return

    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p

        const updated = { ...p, [field]: value }

        if (field === 'value') {
          // If method is Cheque, auto-sync paidValue if installments=1
          if (method === 'Cheque' && updated.installments === 1) {
            updated.paidValue = value as number
          }

          if (updated.installments > 1) {
            updated.details = generateInstallments(
              value as number,
              updated.installments,
              method,
            )
          }
        }

        if (field === 'installments') {
          const count = value as number
          if (count > 1) {
            updated.details = generateInstallments(p.value, count, method)
          } else {
            updated.details = undefined
            const today = new Date()
            const dueDateDate = method === 'Boleto' ? addDays(today, 10) : today
            updated.dueDate = format(dueDateDate, 'yyyy-MM-dd')

            // Re-apply single payment logic
            if (method === 'Cheque') {
              updated.paidValue = updated.value
            } else {
              updated.paidValue = 0 // Reset or keep previous? Resetting seems safer for consistency
            }
          }
        }

        return updated
      }),
    )
  }

  const handleUpdateInstallment = (
    method: PaymentMethodType,
    index: number,
    field: keyof PaymentInstallment,
    value: any,
  ) => {
    if (disabled) return

    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method || !p.details) return p
        const newDetails = [...p.details]
        newDetails[index] = { ...newDetails[index], [field]: value }

        // Check constraints inside installments?
        // For Cheque, if user changes value, should we sync paidValue?
        if (method === 'Cheque' && field === 'value') {
          newDetails[index].paidValue = value
        }

        // Recalculate parent value from sum of installments
        let newValue = p.value
        if (field === 'value') {
          newValue = Number(
            newDetails.reduce((acc, curr) => acc + curr.value, 0).toFixed(2),
          )
        }
        return { ...p, details: newDetails, value: newValue }
      }),
    )
  }

  const handleBlur = (
    method: PaymentMethodType,
    field: 'value' | 'paidValue',
  ) => {
    if (disabled) return
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p
        return { ...p, [field]: Number(p[field].toFixed(2)) }
      }),
    )
  }

  const handleAutoFill = (method: PaymentMethodType, checked: boolean) => {
    if (disabled) return
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p
        return {
          ...p,
          paidValue: checked ? p.value : 0,
        }
      }),
    )
  }

  return (
    <Card className="border-muted bg-muted/10 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Resumos de Recebimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-1 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
            <span className="text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Saldo a Pagar
            </span>
            <span className="text-4xl font-bold text-blue-700 dark:text-blue-400">
              R$ {formatCurrency(saldoAPagar)}
            </span>
          </div>

          <div
            className={cn(
              'flex flex-col space-y-1 p-4 rounded-lg border shadow-sm',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 opacity-70'
                : isComplete
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-900',
            )}
          >
            <span className="text-sm font-medium flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Total Selecionado
            </span>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold">
                R$ {formatCurrency(totalRegistered)}
              </span>
              {!isComplete && !disabled && (
                <span className="text-sm font-medium mb-1">
                  (Restante: R$ {formatCurrency(remaining)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-lg font-semibold">Formas de Pagamento</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = payments.some((p) => p.method === method)
              return (
                <div
                  key={method}
                  className={cn(
                    'flex items-center space-x-3 border rounded-md p-4 transition-colors',
                    disabled
                      ? 'cursor-not-allowed opacity-50 bg-muted/50'
                      : 'cursor-pointer hover:bg-muted',
                    isSelected && !disabled
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-card',
                  )}
                  onClick={() => handleToggleMethod(method, !isSelected)}
                >
                  <Checkbox
                    id={`chk-${method}`}
                    checked={isSelected}
                    disabled={disabled}
                    onCheckedChange={(c) =>
                      handleToggleMethod(method, c as boolean)
                    }
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={`chk-${method}`}
                    className={cn(
                      'font-medium text-base',
                      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    {method}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>

        {payments.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Detalhamento
            </h3>
            <div className="grid gap-4">
              {payments.map((entry) => {
                const isOverpaid = entry.paidValue > entry.value + 0.01
                const isFullyPaid =
                  Math.abs(entry.paidValue - entry.value) < 0.01 &&
                  entry.value > 0

                const isPaidDisabled =
                  entry.method === 'Boleto' || entry.method === 'Cheque'

                return (
                  <div
                    key={entry.method}
                    className="bg-card border rounded-lg p-4 shadow-sm animate-slide-up space-y-4"
                  >
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                      <div className="w-full md:w-24 shrink-0">
                        <Label className="text-xs text-muted-foreground font-bold uppercase mb-1.5 block">
                          Método
                        </Label>
                        <div className="font-semibold text-primary flex items-center justify-center gap-2 h-10 px-2 bg-muted/50 rounded-md border text-sm text-center truncate">
                          {entry.method}
                        </div>
                      </div>

                      <div className="w-full md:flex-1">
                        <Label className="text-xs font-medium mb-1.5 block">
                          Valor Registrado
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-9 font-bold text-lg h-10"
                            value={entry.value}
                            disabled={disabled}
                            onChange={(e) =>
                              handleUpdateEntry(
                                entry.method,
                                'value',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onBlur={() => handleBlur(entry.method, 'value')}
                          />
                        </div>
                      </div>

                      <div className="w-full md:flex-1 space-y-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <Label
                            className={cn(
                              'text-xs font-medium block',
                              isOverpaid ? 'text-red-600' : 'text-green-700',
                            )}
                          >
                            Valor Pago
                          </Label>
                          {!disabled && !isPaidDisabled && (
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`auto-${entry.method}`}
                                checked={isFullyPaid}
                                onCheckedChange={(c) =>
                                  handleAutoFill(entry.method, c as boolean)
                                }
                                className="h-3.5 w-3.5 data-[state=checked]:bg-green-600 border-green-600"
                              />
                              <Label
                                htmlFor={`auto-${entry.method}`}
                                className="text-[10px] text-muted-foreground cursor-pointer font-normal"
                              >
                                Preencher
                              </Label>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className={cn(
                              'pl-9 font-bold text-lg h-10',
                              isOverpaid
                                ? 'border-red-300 bg-red-50 text-red-700 focus-visible:ring-red-200'
                                : 'border-green-200 bg-green-50/20 text-green-700',
                              disabled ? 'bg-muted' : '',
                            )}
                            value={entry.paidValue}
                            disabled={disabled || isPaidDisabled}
                            onChange={(e) =>
                              handleUpdateEntry(
                                entry.method,
                                'paidValue',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onBlur={() => handleBlur(entry.method, 'paidValue')}
                          />
                        </div>
                        {isOverpaid && (
                          <span className="text-[10px] text-red-600 font-medium block mt-1 animate-fade-in">
                            Aviso: Valor pago maior que registrado.
                          </span>
                        )}
                        {entry.method === 'Boleto' && (
                          <span className="text-[10px] text-muted-foreground font-medium block mt-1">
                            Boleto não permite entrada de valor pago imediato.
                          </span>
                        )}
                        {entry.method === 'Cheque' && (
                          <span className="text-[10px] text-muted-foreground font-medium block mt-1">
                            Valor pago é preenchido automaticamente.
                          </span>
                        )}
                      </div>

                      <div className="w-full md:w-20">
                        <Label className="text-xs font-medium mb-1.5 block">
                          Parcelas
                        </Label>
                        <Select
                          value={entry.installments.toString()}
                          disabled={disabled}
                          onValueChange={(val) =>
                            handleUpdateEntry(
                              entry.method,
                              'installments',
                              parseInt(val),
                            )
                          }
                        >
                          <SelectTrigger className="h-10 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(
                              (n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n}x
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {entry.installments === 1 && (
                        <div className="w-full md:w-32">
                          <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Vencimento
                          </Label>
                          <Input
                            type="date"
                            className="h-10 px-2 text-xs"
                            value={entry.dueDate}
                            disabled={disabled}
                            onChange={(e) =>
                              handleUpdateEntry(
                                entry.method,
                                'dueDate',
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    {entry.installments > 1 && entry.details && (
                      <div className="pl-4 border-l-2 border-muted space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                          Parcelas
                        </h4>
                        <div className="grid gap-3">
                          {entry.details.map((inst, idx) => {
                            // Check for ENTRADA logic
                            const isEntrada =
                              idx === 0 &&
                              (entry.method === 'Pix' ||
                                entry.method === 'Dinheiro')
                            const isCheque = entry.method === 'Cheque'

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'flex flex-col sm:flex-row gap-3 items-center p-2 rounded-md',
                                  isEntrada
                                    ? 'bg-red-50 border border-red-100'
                                    : 'bg-muted/20',
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-full sm:w-20 text-sm font-medium',
                                    isEntrada
                                      ? 'text-red-600 font-bold'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  {isEntrada
                                    ? 'ENTRADA'
                                    : `${idx + 1}ª Parcela`}
                                </div>
                                <div className="w-full sm:flex-1 relative">
                                  <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">
                                    R$
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 pl-7 text-sm"
                                    value={inst.value}
                                    disabled={disabled}
                                    onChange={(e) =>
                                      handleUpdateInstallment(
                                        entry.method,
                                        idx,
                                        'value',
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    onBlur={() =>
                                      handleUpdateInstallment(
                                        entry.method,
                                        idx,
                                        'value',
                                        Number(inst.value.toFixed(2)),
                                      )
                                    }
                                  />
                                </div>

                                {/* Paid Value per Installment */}
                                <div className="w-full sm:flex-1 relative">
                                  <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">
                                    Pago: R$
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className={cn(
                                      'h-8 pl-16 text-sm',
                                      isCheque ? 'bg-muted' : '',
                                    )}
                                    value={inst.paidValue}
                                    disabled={
                                      disabled ||
                                      isCheque ||
                                      entry.method === 'Boleto'
                                    }
                                    onChange={(e) =>
                                      handleUpdateInstallment(
                                        entry.method,
                                        idx,
                                        'paidValue',
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>

                                <div className="w-full sm:w-32">
                                  <Input
                                    type="date"
                                    className="h-8 text-sm px-2"
                                    value={inst.dueDate}
                                    disabled={disabled}
                                    onChange={(e) =>
                                      handleUpdateInstallment(
                                        entry.method,
                                        idx,
                                        'dueDate',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
