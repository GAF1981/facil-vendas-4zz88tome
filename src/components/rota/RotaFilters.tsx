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
}

export function RotaFilters({
  filters,
  setFilters,
  sellers,
  municipios,
  clientTypes,
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
      debito_min: '',
      debito_max: '',
      data_acerto_start: '',
      data_acerto_end: '',
      projecao_min: '',
      projecao_max: '',
      estoque_min: '',
      estoque_max: '',
    })
  }

  return (
    <Card className="w-full bg-card border-b shadow-sm rounded-none sm:rounded-md">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
          {/* Search + Clear - Larger prominence */}
          <div className="sm:col-span-2 xl:col-span-2 flex flex-col gap-2">
            <Label htmlFor="search" className="text-sm font-semibold">
              Buscar Cliente
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, Código ou Referência..."
                  value={filters.search}
                  onChange={(e) => handleChange('search', e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                title="Limpar Filtros"
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tipo de Cliente */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Tipo de Cliente</Label>
            <Select
              value={filters.tipo_cliente}
              onValueChange={(v) => handleChange('tipo_cliente', v)}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Selecione o tipo" />
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

          {/* Projeção Range */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Projeção (R$)</Label>
            <div className="flex gap-2 items-center">
              <Input
                className="h-10 text-sm text-center"
                placeholder="Min"
                type="number"
                value={filters.projecao_min}
                onChange={(e) => handleChange('projecao_min', e.target.value)}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                className="h-10 text-sm text-center"
                placeholder="Max"
                type="number"
                value={filters.projecao_max}
                onChange={(e) => handleChange('projecao_max', e.target.value)}
              />
            </div>
          </div>

          {/* X na Rota */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Vezes na Rota</Label>
            <Select
              value={filters.x_na_rota}
              onValueChange={(v) => handleChange('x_na_rota', v)}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1ª vez</SelectItem>
                <SelectItem value="2">2ª vez</SelectItem>
                <SelectItem value="3">3ª vez</SelectItem>
                <SelectItem value=">3">Mais de 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agregado */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Agregado</Label>
            <Select
              value={filters.agregado}
              onValueChange={(v) => handleChange('agregado', v)}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="SIM">Sim</SelectItem>
                <SelectItem value="NÃO">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Município */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Município</Label>
            <Select
              value={filters.municipio}
              onValueChange={(v) => handleChange('municipio', v)}
            >
              <SelectTrigger className="h-10 text-sm">
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

          {/* Vendedor */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Vendedor</Label>
            <Select
              value={filters.vendedor}
              onValueChange={(v) => handleChange('vendedor', v)}
            >
              <SelectTrigger className="h-10 text-sm">
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

          {/* Data Acerto Range */}
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Data do Acerto
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                className="h-10 text-sm"
                type="date"
                value={filters.data_acerto_start}
                onChange={(e) =>
                  handleChange('data_acerto_start', e.target.value)
                }
              />
              <span className="text-muted-foreground">até</span>
              <Input
                className="h-10 text-sm"
                type="date"
                value={filters.data_acerto_end}
                onChange={(e) =>
                  handleChange('data_acerto_end', e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
