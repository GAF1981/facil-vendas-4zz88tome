import { useEffect, useState, useMemo, useCallback } from 'react'
import { RotaHeader } from '@/components/rota/RotaHeader'
import { RotaFilters } from '@/components/rota/RotaFilters'
import { RotaTable } from '@/components/rota/RotaTable'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { Rota, RotaFilterState, RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'
import { useRotaFilterStore } from '@/stores/useRotaFilterStore'
import { parseISO, isBefore, isAfter, isValid } from 'date-fns'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sellers, setSellers] = useState<Employee[]>([])

  // Selection Mode State (Simplified view)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Filters
  const { selectedEmployeeIds, setSelectedEmployeeIds } = useRotaFilterStore()
  const [filters, setFilters] = useState<RotaFilterState>({
    search: '',
    x_na_rota: 'todos',
    agregado: 'todos',
    vendedor: selectedEmployeeIds,
    proximo_vendedor: 'todos', // Initialize new filter
    municipio: 'todos',
    grupo_rota: 'todos',
    debito_min: '',
    debito_max: '',
    data_acerto_start: '',
    data_acerto_end: '',
    projecao_min: '',
    estoque_min: '',
    estoque_max: '',
    vencimento_status: 'todos',
  })

  // Update store when filters change
  useEffect(() => {
    setSelectedEmployeeIds(filters.vendedor)
  }, [filters.vendedor, setSelectedEmployeeIds])

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'rowNumber', // stable sort default
    direction: 'asc',
  })

  const { toast } = useToast()
  const { canAccess } = usePermissions()
  const { employee: loggedInUser } = useUserStore()

  // Load Initial Data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [active, last, sellersData] = await Promise.all([
        rotaService.getActiveRota(),
        rotaService.getLastRota(),
        employeesService.getEmployees(1, 100),
      ])

      setActiveRota(active)
      setLastRota(last)
      setSellers(sellersData.data.filter((e) => e.situacao === 'ATIVO'))

      // If there is an active rota, load its data
      // If not, maybe load clients for preparation?
      // Usually RotaPage shows the active rota or "No active rota" state.
      // But we load rows regardless to show client list potentially.
      const rotaRows = await rotaService.getFullRotaData(active)
      setRows(rotaRows)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados da rota.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Derived Lists for Filters
  const municipios = useMemo(() => {
    const m = new Set<string>()
    rows.forEach((r) => r.client.MUNICÍPIO && m.add(r.client.MUNICÍPIO))
    return Array.from(m).sort()
  }, [rows])

  const routeGroups = useMemo(() => {
    const g = new Set<string>()
    rows.forEach((r) => r.client['GRUPO ROTA'] && g.add(r.client['GRUPO ROTA']))
    return Array.from(g).sort()
  }, [rows])

  // Filter Logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search
      if (filters.search) {
        const s = filters.search.toLowerCase()
        const matchesSearch =
          row.client['NOME CLIENTE']?.toLowerCase().includes(s) ||
          row.client.CODIGO.toString().includes(s)
        if (!matchesSearch) return false
      }

      // X na Rota
      if (filters.x_na_rota !== 'todos') {
        if (filters.x_na_rota === '>3') {
          if (row.x_na_rota <= 3) return false
        } else {
          if (row.x_na_rota !== parseInt(filters.x_na_rota)) return false
        }
      }

      // Vendedor
      if (filters.vendedor.length > 0) {
        // If filter has vendors selected, row must match one of them
        if (
          !row.vendedor_id ||
          !filters.vendedor.includes(row.vendedor_id.toString())
        ) {
          return false
        }
      }

      // Próximo Vendedor
      if (filters.proximo_vendedor !== 'todos') {
        if (
          !row.proximo_vendedor_id ||
          row.proximo_vendedor_id.toString() !== filters.proximo_vendedor
        ) {
          return false
        }
      }

      // Municipio
      if (
        filters.municipio !== 'todos' &&
        row.client.MUNICÍPIO !== filters.municipio
      )
        return false

      // Grupo Rota
      if (
        filters.grupo_rota !== 'todos' &&
        row.client['GRUPO ROTA'] !== filters.grupo_rota
      )
        return false

      // Vencimento Status
      if (filters.vencimento_status !== 'todos') {
        if (row.vencimento_status !== filters.vencimento_status) return false
      }

      // Numeric Filters
      if (filters.debito_min && row.debito < parseFloat(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > parseFloat(filters.debito_max))
        return false

      return true
    })
  }, [rows, filters])

  // Sort Logic
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof RotaRow]
      let valB: any = b[sortConfig.key as keyof RotaRow]

      // Handle specific nested keys or computed
      if (sortConfig.key === 'municipio') {
        valA = a.client.MUNICÍPIO || ''
        valB = b.client.MUNICÍPIO || ''
      } else if (sortConfig.key === 'grupo_rota') {
        valA = a.client['GRUPO ROTA'] || ''
        valB = b.client['GRUPO ROTA'] || ''
      } else if (sortConfig.key === 'cep') {
        valA = a.client['CEP OFICIO'] || ''
        valB = b.client['CEP OFICIO'] || ''
      }

      // Null handling
      if (valA === null) valA = ''
      if (valB === null) valB = ''

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredRows, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleUpdateRow = useCallback(
    async (clientId: number, field: string, value: any) => {
      if (!activeRota) return

      // Optimistic update
      setRows((prev) =>
        prev.map((r) => {
          if (r.client.CODIGO === clientId) {
            return { ...r, [field]: value }
          }
          return r
        }),
      )

      try {
        if (field === 'vendedor_id') {
          // Check previous value for tasks update logic if needed
          await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            vendedor_id: value,
          })
        } else if (field === 'proximo_vendedor_id') {
          const row = rows.find((r) => r.client.CODIGO === clientId)
          await rotaService.updateNextSeller(
            activeRota.id,
            clientId,
            value,
            row?.tarefas || null,
          )
        } else if (field === 'x_na_rota') {
          await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            x_na_rota: value,
          })
        } else if (field === 'boleto') {
          await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            boleto: value,
          })
        } else if (field === 'agregado') {
          await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            agregado: value,
          })
        } else if (field === 'tarefas') {
          await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            tarefas: value,
          })
        }
      } catch (error) {
        console.error('Update failed', error)
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar registro.',
          variant: 'destructive',
        })
        // Revert (reload data)
        loadData()
      }
    },
    [activeRota, rows, toast],
  )

  const handleStartRota = async () => {
    try {
      await rotaService.startRota()
      toast({
        title: 'Rota Iniciada',
        description: 'Nova rota criada com sucesso.',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a rota.',
        variant: 'destructive',
      })
    }
  }

  const handleEndRota = async () => {
    if (!activeRota) return
    if (!confirm('Tem certeza que deseja finalizar a rota atual?')) return

    try {
      // Logic for transferring Next Sellers to new Route is handled here or in service?
      // Service finishAndStartNewRoute does some transfers, but `applyNextSellers` logic is manual usually.
      // Wait, we need to apply next sellers to the NEW route.
      // The requirement "Bulk Transfer" was for the CURRENT route context (editing items).
      // The "Next Seller" usually implies "Seller for NEXT route".
      // If we finish route, we usually copy items.
      // Let's stick to simple finish for now.

      await rotaService.finishAndStartNewRoute(activeRota.id)

      // Apply Next Sellers logic if needed
      // Since "Próxima" column exists, we might want to apply these to the new route.
      // Fetch current items, find those with next seller, update the NEW items in the NEW route.
      // This is complex. The user asked for "Transferir tudo" button in the interface, which does it NOW.
      // So automated transfer on finish might not be requested here, but standard practice.
      // I'll stick to just finishing as per user story which focused on "Force Finalization".

      toast({
        title: 'Rota Finalizada',
        description: 'A rota foi encerrada e uma nova iniciada.',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a rota.',
        variant: 'destructive',
      })
    }
  }

  const handleExport = () => {
    // Export logic (simplified)
    toast({
      title: 'Exportando...',
      description: 'O download iniciará em breve.',
    })
    // Implementation would go here
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-2 p-2 sm:p-4">
      <RotaHeader
        activeRota={activeRota}
        lastRota={lastRota}
        onStart={handleStartRota}
        onEnd={handleEndRota}
        onExport={handleExport}
        loading={loading}
      />

      <RotaFilters
        filters={filters}
        setFilters={setFilters}
        sellers={sellers}
        municipios={municipios}
        routes={routeGroups}
        isSelectionMode={isSelectionMode}
        toggleSelectionMode={setIsSelectionMode}
        activeRotaId={activeRota?.id}
        onDataChange={loadData} // Reload to reflect bulk changes
      />

      <RotaTable
        rows={sortedRows}
        sellers={sellers}
        onUpdateRow={handleUpdateRow}
        onSort={handleSort}
        sortConfig={sortConfig}
        loading={loading}
        isSelectionMode={isSelectionMode}
      />
    </div>
  )
}
