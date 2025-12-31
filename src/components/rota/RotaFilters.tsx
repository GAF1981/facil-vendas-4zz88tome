import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RotaFilterState } from '@/types/rota'
import { Employee } from '@/types/employee'
import { Button } from '@/components/ui/button'
import { Eraser, Search, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface RotaFiltersProps {
  filters: RotaFilterState
  setFilters: (filters: RotaFilterState) => void
  sellers: Employee[]
  municipios: string[]
  clientTypes: string[]
  routes: string[]
}

export function RotaFilters({
  filters,
  setFilters,
  sellers,
  municipios,
  clientTypes,
  routes,
}: RotaFiltersProps) {
  const handleChange = (key: keyof RotaFilterState, value: string) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      x_na_rota: 'todos',
      agregado: 'todos',
      vendedor: 'todos',
      municipio: 'todos',
      tipo_cliente: 'todos',
      grupo_rota: 'todos',
      debito_min: '',
      debito_max: '',
      data_acerto_start: '',
      data_acerto_end: '',
      projecao_min: '',
      // projecao_max removed
      estoque_min: '',
      estoque_max: '',
    })
  }

  return (
    <Card className="w-full bg-card border-b shadow-sm rounded-none sm:rounded-md">
      <CardContent className="p-4">
        {/* Responsive Grid Layout optimized for space */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 items-end">
          {/* Search + Clear - Larger prominence */}
          <div className="col-span-2 md:col-span-4 lg:col-span-3 xl:col-span-3 flex flex-col gap-1.5">
            <Label htmlFor="search" className="text-xs font-semibold">
              Buscar Cliente
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, Código ou Referência..."
                  value={filters.search}
                  onChange={(e) => handleChange('search', e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                title="Limpar Filtros"
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Rota - New Filter */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Rota</Label>
            <Select
              value={filters.grupo_rota}
              onValueChange={(v) => handleChange('grupo_rota', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendedor */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Vendedor</Label>
            <Select
              value={filters.vendedor}
              onValueChange={(v) => handleChange('vendedor', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Cliente */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Tipo</Label>
            <Select
              value={filters.tipo_cliente}
              onValueChange={(v) => handleChange('tipo_cliente', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Projeção Min - Removed Max */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">
              Projeção Min (R$)
            </Label>
            <Input
              className="h-9 text-xs text-center"
              placeholder="Min"
              type="number"
              value={filters.projecao_min}
              onChange={(e) => handleChange('projecao_min', e.target.value)}
            />
          </div>

          {/* X na Rota - Compact */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">xRota</Label>
            <Select
              value={filters.x_na_rota}
              onValueChange={(v) => handleChange('x_na_rota', v)}
            >
              <SelectTrigger className="h-9 text-xs px-2">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1ª</SelectItem>
                <SelectItem value="2">2ª</SelectItem>
                <SelectItem value="3">3ª</SelectItem>
                <SelectItem value=">3">&gt;3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agregado - Compact */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">Agreg.</Label>
            <Select
              value={filters.agregado}
              onValueChange={(v) => handleChange('agregado', v)}
            >
              <SelectTrigger className="h-9 text-xs px-2">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="SIM">Sim</SelectItem>
                <SelectItem value="NÃO">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Município */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Município</Label>
            <Select
              value={filters.municipio}
              onValueChange={(v) => handleChange('municipio', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {municipios.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
