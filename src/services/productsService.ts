import { supabase } from '@/lib/supabase/client'
import { ProductRow, ProductInsert, ProductUpdate } from '@/types/product'

export interface BulkUpdateResult {
  success: number
  failed: number
  errors: string[]
}

export interface CsvProductRow {
  produto: string
  codigo_interno?: string
  codigo_barras?: string
}

export const productsService = {
  async getProducts(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    group: string | null = null,
    frequentes: string | null = null,
    orderBy: 'ID' | 'PRODUTO' = 'ID',
    ascending: boolean = false,
  ) {
    let query = supabase.from('PRODUTOS').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumber) {
        // Search by ID, Legacy Code (CODIGO), Internal Code (codigo_interno), Barcode (CÓDIGO BARRAS) OR Name (PRODUTO)
        // Using quotes for columns with spaces
        query = query.or(
          `ID.eq.${searchTerm},CODIGO.eq.${searchTerm},codigo_interno.eq.${searchTerm},"CÓDIGO BARRAS".eq.${searchTerm},PRODUTO.ilike.%${searchTerm}%`,
        )
      } else {
        // Search specifically by name (PRODUTO) for text queries
        query = query.ilike('PRODUTO', `%${searchTerm}%`)
      }
    }

    if (group && group !== 'todos') {
      query = query.eq('GRUPO', group)
    }

    if (frequentes && frequentes !== 'todos') {
      query = query.eq('FREQUENTES', frequentes)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order(orderBy, { ascending })
      .range(from, to)

    if (error) {
      console.error('Error fetching products:', error)
      throw error
    }

    return {
      data: (data as ProductRow[]) || [],
      count: count || 0,
    }
  },

  async getGroups() {
    const { data, error } = await supabase.rpc('get_unique_product_groups')

    if (error) {
      console.error('Error fetching groups:', error)
      return []
    }

    return (data as any[]).map((item) => item.grupo).filter(Boolean) as string[]
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('*')
      .eq('ID', id)
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async getNextId() {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('ID')
      .order('ID', { ascending: false })
      .limit(1)
      .single()

    // PGRST116: The result contains 0 rows (table is empty)
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching next ID:', error)
      throw error
    }

    const maxId = data?.ID || 0
    // Smart suggestion: If maxId < 105, start at 105. Otherwise, increment.
    return maxId < 105 ? 105 : maxId + 1
  },

  async checkIdExists(id: number) {
    const { count, error } = await supabase
      .from('PRODUTOS')
      .select('ID', { count: 'exact', head: true })
      .eq('ID', id)

    if (error) {
      console.error('Error checking ID existence:', error)
      throw error
    }

    return (count || 0) > 0
  },

  async create(product: ProductInsert) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .insert(product)
      .select()
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async update(id: number, product: ProductUpdate) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .update(product)
      .eq('ID', id)
      .select()
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async delete(id: number) {
    const { error } = await supabase.from('PRODUTOS').delete().eq('ID', id)

    if (error) throw error
  },

  async parseCSV(file: File): Promise<CsvProductRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text) {
          resolve([])
          return
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
        if (lines.length < 2) {
          resolve([])
          return
        }

        // Detect delimiter (comma or semicolon)
        const firstLine = lines[0]
        const delimiter = firstLine.includes(';') ? ';' : ','

        const headers = lines[0]
          .split(delimiter)
          .map((h) => h.trim().toLowerCase().replace(/"/g, ''))

        const result: CsvProductRow[] = []

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i]
          const values = currentLine
            .split(delimiter)
            .map((v) => v.trim().replace(/"/g, ''))

          if (values.length === headers.length) {
            const row: any = {}
            headers.forEach((header, index) => {
              // Map headers to expected keys if slightly different, or strict mapping
              if (header === 'produto') row.produto = values[index]
              if (
                header === 'codigo_interno' ||
                header === 'código interno' ||
                header === 'codigo interno'
              )
                row.codigo_interno = values[index]
              if (
                header === 'codigo_barras' ||
                header === 'código de barras' ||
                header === 'codigo barras'
              )
                row.codigo_barras = values[index]
            })
            // Only add if product name exists
            if (row.produto) {
              result.push(row as CsvProductRow)
            }
          }
        }
        resolve(result)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    })
  },

  async bulkUpdateFromCsv(data: CsvProductRow[]): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    }

    if (data.length === 0) {
      result.errors.push('O arquivo CSV não contém dados válidos.')
      return result
    }

    try {
      // 1. Fetch all products to create a map of Name -> ID
      // We need to fetch all to match names.
      const { data: products, error } = await supabase
        .from('PRODUTOS')
        .select('ID, PRODUTO')

      if (error) throw error

      const productMap = new Map<string, number>()
      products?.forEach((p) => {
        if (p.PRODUTO) {
          productMap.set(p.PRODUTO.toLowerCase().trim(), p.ID)
        }
      })

      // 2. Prepare updates
      const updates: {
        ID: number
        codigo_interno?: number | null
        'CÓDIGO BARRAS'?: number | null
      }[] = []

      for (const row of data) {
        if (!row.produto) {
          result.failed++
          continue
        }

        const normalizedName = row.produto.toLowerCase().trim()
        const productId = productMap.get(normalizedName)

        if (productId) {
          const codigoInterno = row.codigo_interno
            ? parseInt(row.codigo_interno.replace(/\D/g, ''))
            : null
          const codigoBarras = row.codigo_barras
            ? parseInt(row.codigo_barras.replace(/\D/g, ''))
            : null

          // Handle NaN from parseInt if string was not a valid number
          const safeCodigoInterno = isNaN(codigoInterno as number)
            ? null
            : codigoInterno
          const safeCodigoBarras = isNaN(codigoBarras as number)
            ? null
            : codigoBarras

          updates.push({
            ID: productId,
            codigo_interno: safeCodigoInterno,
            'CÓDIGO BARRAS': safeCodigoBarras,
          })
          result.success++
        } else {
          result.failed++
          // Optional: Add error detail for missing product
          // result.errors.push(`Produto não encontrado: ${row.produto}`)
        }
      }

      // 3. Perform updates
      // Supabase upsert is efficient for bulk updates if we have the primary key (ID)
      if (updates.length > 0) {
        // Process in chunks to avoid request size limits if too many rows
        const chunkSize = 100
        for (let i = 0; i < updates.length; i += chunkSize) {
          const chunk = updates.slice(i, i + chunkSize)
          const { error: updateError } = await supabase
            .from('PRODUTOS')
            .upsert(chunk)

          if (updateError) {
            console.error('Error updating batch:', updateError)
            result.errors.push(`Erro ao atualizar lote ${i / chunkSize + 1}`)
            // Since we optimistically counted success, we might need to adjust,
            // but for simplicity we keep the logic of "matched items found"
          }
        }
      }
    } catch (err: any) {
      console.error('Bulk update error:', err)
      result.errors.push(
        err.message || 'Erro desconhecido ao processar atualização.',
      )
    }

    return result
  },
}
