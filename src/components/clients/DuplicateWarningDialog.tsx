import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

interface DuplicateWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  duplicateData: {
    name: string
    debt?: number
  } | null
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  duplicateData,
}: DuplicateWarningDialogProps) {
  if (!duplicateData) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            CNPJ/CPF Duplicado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-foreground">
            <p>
              Esse CNPJ/CPF já está cadastrado no cliente{' '}
              <strong>{duplicateData.name}</strong>.
            </p>
            {duplicateData.debt !== undefined && duplicateData.debt > 0 && (
              <p className="font-semibold text-red-600">
                Atenção: Este cliente possui um débito pendente de R${' '}
                {formatCurrency(duplicateData.debt)}.
              </p>
            )}
            <p className="pt-2 font-medium">Deseja prosseguir?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Não
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sim</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
