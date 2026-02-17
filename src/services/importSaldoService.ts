import { supabase } from '@/lib/supabase/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { format } from 'date-fns'

export interface ImportResult {
  successCount: number
  failureCount: number
  errors: string[]
}

export type CsvRow = Record<string, string>

interface ProductInfo {
  id: number
  codigo: number | null
  name: string
  codigo_interno: string | null
}

export const importSaldoService = {
  async parseCSV(file: File): Promise<CsvRow[]> {
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

        const result: CsvRow[] = []

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i]
          // Handle quotes if necessary
          const values = currentLine
            .split(delimiter)
            .map((v) => v.trim().replace(/"/g, ''))

          if (values.length === headers.length) {
            const row: CsvRow = {}
            headers.forEach((header, index) => {
              row[header] = values[index]
            })
            result.push(row)
          }
        }
        resolve(result)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    })
  },

  async processImport(
    csvData: CsvRow[],
    employeeId: number,
    employeeName: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    }

    if (csvData.length === 0) {
      result.errors.push('O arquivo CSV está vazio ou inválido.')
      return result
    }

    // 1. Fetch Reference Data for Validation
    // Fetch all clients (Lightweight)
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('CODIGO, "NOME CLIENTE"')

    if (clientsError || !clients) {
      throw new Error('Falha ao carregar lista de clientes para validação.')
    }

    const clientMap = new Map<number, string>()
    clients.forEach((c) => clientMap.set(c.CODIGO, c['NOME CLIENTE']))

    // Fetch all products (Including codigo_interno)
    const { data: products, error: productsError } = await supabase
      .from('PRODUTOS')
      .select('ID, CODIGO, PRODUTO, codigo_interno')

    if (productsError || !products) {
      throw new Error('Falha ao carregar lista de produtos para validação.')
    }

    // Maps for different lookup methods
    const mapId = new Map<number, ProductInfo>()
    const mapCodigo = new Map<number, ProductInfo>()
    const mapCodigoInterno = new Map<string, ProductInfo>()

    products.forEach((p) => {
      const info: ProductInfo = {
        id: p.ID,
        codigo: p.CODIGO,
        name: p.PRODUTO || '',
        codigo_interno: p.codigo_interno,
      }

      // Map by ID
      mapId.set(p.ID, info)

      // Map by CODIGO (Legacy/Short code)
      if (p.CODIGO) {
        mapCodigo.set(p.CODIGO, info)
      }

      // Map by codigo_interno
      if (p.codigo_interno) {
        // Normalize: trim
        mapCodigoInterno.set(p.codigo_interno.trim(), info)
      }
    })

    // 2. Validate and Group Data
    // We group by Client to create efficient transactions (Acertos)
    const validGroups = new Map<
      number,
      {
        clientName: string
        items: {
          productId: number
          productCodigo: number | null
          productName: string
          quantity: number
        }[]
      }
    >()

    let rowIndex = 1 // 1-based index for user feedback (skipping header)

    for (const row of csvData) {
      rowIndex++

      // Get Client Code
      const clientCodeVal =
        row['código do cliente'] ||
        row['codigo do cliente'] ||
        row['codigo_cliente'] ||
        '0'
      const clientCode = parseInt(clientCodeVal)

      // Get Product Code (Keep as string initially for internal code lookup)
      const productCodeRaw =
        row['código do produto'] ||
        row['codigo do produto'] ||
        row['codigo_produto'] ||
        row['produto_codigo'] ||
        ''

      // Get Quantity
      const quantityVal = row['quantidade'] || '0'
      const quantity = parseFloat(quantityVal.replace(',', '.'))

      // Validation
      if (!clientCode) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Código do cliente inválido ou faltando.`,
        )
        continue
      }

      if (!productCodeRaw) {
        result.failureCount++
        result.errors.push(`Linha ${rowIndex}: Código do produto faltando.`)
        continue
      }

      if (!clientMap.has(clientCode)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Cliente código ${clientCode} não encontrado.`,
        )
        continue
      }

      // Product Lookup Logic
      let productInfo: ProductInfo | undefined

      // 1. Try codigo_interno (Exact String Match)
      const codeTrimmed = productCodeRaw.trim()
      if (mapCodigoInterno.has(codeTrimmed)) {
        productInfo = mapCodigoInterno.get(codeTrimmed)
      }

      // 2. Try ID and CODIGO (Numeric Match)
      if (!productInfo) {
        const codeNum = parseInt(productCodeRaw)
        if (!isNaN(codeNum)) {
          // Priority: ID > CODIGO
          if (mapId.has(codeNum)) {
            productInfo = mapId.get(codeNum)
          } else if (mapCodigo.has(codeNum)) {
            productInfo = mapCodigo.get(codeNum)
          }
        }
      }

      if (!productInfo) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Produto código '${productCodeRaw}' não encontrado.`,
        )
        continue
      }

      if (isNaN(quantity)) {
        result.failureCount++
        result.errors.push(`Linha ${rowIndex}: Quantidade inválida.`)
        continue
      }

      // Add to valid groups
      if (!validGroups.has(clientCode)) {
        validGroups.set(clientCode, {
          clientName: clientMap.get(clientCode)!,
          items: [],
        })
      }

      validGroups.get(clientCode)!.items.push({
        productId: productInfo.id,
        productCodigo: productInfo.codigo,
        productName: productInfo.name,
        quantity,
      })
    }

    // 3. Execute Insertions per Client Group
    const today = new Date()
    const dateStr = format(today, 'yyyy-MM-dd')
    const timeStr = format(today, 'HH:mm:ss')
    const isoStr = today.toISOString()

    for (const [clientCode, groupData] of validGroups) {
      try {
        // Reserve Order Number
        const orderId = await bancoDeDadosService.reserveNextOrderNumber()

        // Prepare BANCO_DE_DADOS inserts
        const bancoInserts = groupData.items.map((item) => ({
          'NÚMERO DO PEDIDO': orderId,
          'CÓDIGO DO CLIENTE': clientCode,
          CLIENTE: groupData.clientName,
          'COD. PRODUTO': item.productCodigo, // Use real CODIGO if available
          MERCADORIA: item.productName,
          'SALDO FINAL': item.quantity,
          'SALDO INICIAL': 0,
          'QUANTIDADE VENDIDA': '0',
          TIPO: 'SALDO INICIAL',
          'DATA DO ACERTO': dateStr,
          'HORA DO ACERTO': timeStr,
          'DATA E HORA': isoStr,
          'CODIGO FUNCIONARIO': employeeId,
          FUNCIONÁRIO: employeeName,
          'VALOR VENDIDO': '0',
          'PREÇO VENDIDO': '0',
          'VALOR VENDA PRODUTO': '0',
          FORMA: 'IMPORTAÇÃO',
          CONTAGEM: 0,
          'NOVAS CONSIGNAÇÕES': '0',
          RECOLHIDO: '0',
        }))

        // Prepare AJUSTE_SALDO_INICIAL inserts
        const ajusteInserts = groupData.items.map((item) => ({
          cliente_id: clientCode,
          cliente_nome: groupData.clientName,
          produto_id: item.productId, // Use robust ID
          quantidade_alterada: item.quantity,
          saldo_anterior: 0,
          saldo_novo: item.quantity,
          vendedor_id: employeeId,
          vendedor_nome: employeeName,
          data_acerto: isoStr,
          numero_pedido: orderId,
        }))

        // Execute Batch Inserts
        const { error: bancoError } = await supabase
          .from('BANCO_DE_DADOS')
          .insert(bancoInserts)
        if (bancoError) throw bancoError

        const { error: ajusteError } = await supabase
          .from('AJUSTE_SALDO_INICIAL')
          .insert(ajusteInserts)
        if (ajusteError) throw ajusteError

        result.successCount += groupData.items.length
      } catch (error: any) {
        console.error(`Error importing for client ${clientCode}:`, error)
        result.failureCount += groupData.items.length
        result.errors.push(
          `Erro ao salvar dados do cliente ${clientCode}: ${error.message}`,
        )
      }
    }

    return result
  },
}
