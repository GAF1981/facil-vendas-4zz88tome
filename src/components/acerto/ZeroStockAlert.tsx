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

interface ZeroStockAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

export function ZeroStockAlert({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: ZeroStockAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            Atenção: Acerto Finalizado sem Estoque!!!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base font-medium text-foreground">
            Isso implica em tornar o cliente INATIVO, caso ele não tenha débito.
          </AlertDialogDescription>
          <AlertDialogDescription>Deseja prosseguir?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>NÃO</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            SIM
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
