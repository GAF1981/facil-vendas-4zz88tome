import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Loader2 } from 'lucide-react'
import { ClientRow } from '@/types/client'
import { clientsService } from '@/services/clientsService'
import { useToast } from '@/hooks/use-toast'

interface ClientSearchProps {
  onSelect: (client: ClientRow) => void
  disabled?: boolean
}

export function ClientSearch({ onSelect, disabled }: ClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<ClientRow[]>([])
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      // Fetch clients (limit 50 for search results)
      const { data } = await clientsService.getClients(1, 50, searchTerm)

      if (data.length === 0) {
        toast({
          title: 'Nenhum cliente encontrado',
          description: 'Verifique o código ou nome e tente novamente.',
          variant: 'destructive',
        })
        setResults([])
      } else if (data.length === 1) {
        onSelect(data[0])
        setSearchTerm('')
        setResults([])
      } else {
        setResults(data)
        setShowResults(true)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar os clientes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelectFromDialog = (client: ClientRow) => {
    onSelect(client)
    setShowResults(false)
    setSearchTerm('')
    setResults([])
  }

  return (
    <>
      <div className="flex gap-2 w-full max-w-lg">
        <Input
          placeholder="Buscar por Código ou Nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className="flex-1"
          autoFocus
        />
        <Button
          onClick={handleSearch}
          disabled={disabled || loading || !searchTerm.trim()}
          size="icon"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecione um Cliente</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade / Bairro</TableHead>
                  <TableHead className="w-[100px] text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((client) => (
                  <TableRow key={client.CODIGO} className="hover:bg-muted/50">
                    <TableCell className="font-mono">{client.CODIGO}</TableCell>
                    <TableCell className="font-medium">
                      {client['NOME CLIENTE']}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{client.MUNICÍPIO || '-'}</span>
                        <span className="text-muted-foreground text-xs">
                          {client.BAIRRO || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSelectFromDialog(client)}
                      >
                        Selecionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
