import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProductFormData, productSchema, ProductRow } from '@/types/product'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Loader2, Save, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { productsService } from '@/services/productsService'
import { useToast } from '@/hooks/use-toast'

interface ProductFormProps {
  initialData?: ProductRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProductForm({
  initialData,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ID: initialData.ID,
          PRODUTO: initialData.PRODUTO,
          CODIGO: initialData.CODIGO,
          'CÓDIGO BARRAS': initialData['CÓDIGO BARRAS'],
          'DESCRIÇÃO RESUMIDA': initialData['DESCRIÇÃO RESUMIDA'],
          GRUPO: initialData.GRUPO,
          PREÇO: initialData.PREÇO,
          TIPO: initialData.TIPO,
        }
      : {
          ID: undefined, // Will be set by useEffect
          PRODUTO: '',
          CODIGO: null,
          'CÓDIGO BARRAS': null,
          'DESCRIÇÃO RESUMIDA': '',
          GRUPO: '',
          PREÇO: '',
          TIPO: '',
        },
  })

  // Auto-generate ID for new products
  useEffect(() => {
    // Only fetch next ID if we are creating a new product (no initialData)
    // and we haven't set an ID yet (or if we want to ensure freshness)
    if (!initialData) {
      const loadNextId = async () => {
        try {
          const nextId = await productsService.getNextId()
          form.setValue('ID', nextId)
        } catch (err) {
          console.error('Failed to fetch next ID', err)
          toast({
            title: 'Aviso',
            description: 'Não foi possível gerar o próximo ID automaticamente.',
            variant: 'destructive',
          })
        }
      }
      loadNextId()
    }
  }, [initialData, form, toast])

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true)
    try {
      // Ensure ID is present
      if (!data.ID) {
        throw new Error('ID do produto não definido')
      }

      // Explicitly construct payload to ensure correct types
      const payload = {
        ...data,
        ID: data.ID,
      }

      if (initialData) {
        await productsService.update(initialData.ID, payload)
        toast({
          title: 'Produto atualizado',
          description: 'Os dados foram salvos com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      } else {
        await productsService.create(payload as any)
        toast({
          title: 'Produto cadastrado',
          description: 'Novo produto adicionado com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      }
      onSuccess?.()
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Dados do Produto</h3>
          </div>
          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* ID Field - Read Only */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="ID"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID (Automático)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        value={field.value || 'Carregando...'}
                        className="bg-muted font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Name */}
            <div className="md:col-span-10">
              <FormField
                control={form.control}
                name="PRODUTO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Caneta Esferográfica Azul"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Barcode */}
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="CÓDIGO BARRAS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="EAN / GTIN"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Internal Code */}
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="CODIGO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Interno</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Opcional"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price */}
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="PREÇO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type */}
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="TIPO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo / Unidade</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: UN, KG, CX"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Group */}
            <div className="md:col-span-6">
              <FormField
                control={form.control}
                name="GRUPO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo / Categoria</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Papelaria"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Summary Description */}
            <div className="md:col-span-6">
              <FormField
                control={form.control}
                name="DESCRIÇÃO RESUMIDA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Resumida</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Para notas e relatórios"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {initialData ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
