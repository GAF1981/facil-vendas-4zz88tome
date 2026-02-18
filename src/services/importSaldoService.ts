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
  codigo_interno: string
  name: string
}

// Synonyms definitions
const HEADER_SYNONYMS = {
  clientCode: [
    'CODIGO DO CLIENTE',
    'COD. CLIENTE',
    'CODIGO CLIENTE',
    'ID CLIENTE',
    'CLIENTE ID',
    'COD CLIENTE',
  ],
  productCode: [
    'CODIGO INTERNO',
    'COD. INTERNO',
    'CODIGO PRODUTO',
    'COD. PRODUTO',
    'COD PRODUTO',
    'PRODUTO CODIGO',
  ],
  quantity: ['SALDO INICIAL', 'QUANTIDADE', 'QTD', 'CONTAGEM', 'SALDO'],
}

const normalizeHeader = (header: string) => {
  return header
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
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

        // Keep original headers for row mapping, but we will analyze them later
        const headers = lines[0]
          .split(delimiter)
          .map((h) => h.trim().replace(/^"|"$/g, ''))

        const result: CsvRow[] = []

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i]
          // Handle simple quotes handling
          // This regex splits by delimiter but ignores delimiters inside quotes
          const regex = new RegExp(
            `\\s*${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)\\s*`,
          )
          const values = currentLine
            .split(regex)
            .map((v) => v.trim().replace(/^"|"$/g, ''))

          // Allow partial rows if at least important columns are there?
          // Better to enforce length check or handle missing values gracefully
          if (values.length > 0) {
            const row: CsvRow = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
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

  identifyColumns(sampleRow: CsvRow): {
    clientCol: string | null
    productCol: string | null
    qtyCol: string | null
  } {
    const headers = Object.keys(sampleRow)
    const normalizedHeaders = headers.map((h) => ({
      original: h,
      normalized: normalizeHeader(h),
    }))

    const findColumn = (synonyms: string[]) => {
      const normalizedSynonyms = synonyms.map(normalizeHeader)
      const match = normalizedHeaders.find((h) =>
        normalizedSynonyms.includes(h.normalized),
      )
      return match ? match.original : null
    }

    return {
      clientCol: findColumn(HEADER_SYNONYMS.clientCode),
      productCol: findColumn(HEADER_SYNONYMS.productCode),
      qtyCol: findColumn(HEADER_SYNONYMS.quantity),
    }
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

    // 1. Identify Columns
    const { clientCol, productCol, qtyCol } = this.identifyColumns(csvData[0])

    if (!clientCol) {
      result.errors.push(
        `Coluna de CÓDIGO DO CLIENTE não encontrada. (Esperado: ${HEADER_SYNONYMS.clientCode.join(', ')})`,
      )
    }
    if (!productCol) {
      result.errors.push(
        `Coluna de CÓDIGO DO PRODUTO (INTERNO) não encontrada. (Esperado: ${HEADER_SYNONYMS.productCode.join(', ')})`,
      )
    }
    if (!qtyCol) {
      result.errors.push(
        `Coluna de QUANTIDADE não encontrada. (Esperado: ${HEADER_SYNONYMS.quantity.join(', ')})`,
      )
    }

    if (!clientCol || !productCol || !qtyCol) {
      return result
    }

    // 2. Fetch Reference Data for Validation
    // Fetch all clients (Lightweight)
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('CODIGO, "NOME CLIENTE"')

    if (clientsError || !clients) {
      throw new Error('Falha ao carregar lista de clientes para validação.')
    }

    const clientMap = new Map<number, string>()
    clients.forEach((c) => clientMap.set(c.CODIGO, c['NOME CLIENTE']))

    // Fetch all products (ID, codigo_interno, PRODUTO)
    const { data: products, error: productsError } = await supabase
      .from('PRODUTOS')
      .select('ID, codigo_interno, PRODUTO')

    if (productsError || !products) {
      throw new Error('Falha ao carregar lista de produtos para validação.')
    }

    // Map by codigo_interno (string match)
    const mapCodigoInterno = new Map<string, ProductInfo>()

    products.forEach((p) => {
      const info: ProductInfo = {
        id: p.ID,
        codigo_interno: p.codigo_interno || '',
        name: p.PRODUTO || '',
      }

      if (p.codigo_interno) {
        // Normalize: trim
        mapCodigoInterno.set(p.codigo_interno.trim(), info)
      }
    })

    // 3. Validate and Group Data
    // We group by Client to create efficient transactions
    const validGroups = new Map<
      number,
      {
        clientName: string
        items: {
          productId: number
          productName: string
          quantity: number
        }[]
      }
    >()

    let rowIndex = 1 // 1-based index for user feedback (skipping header)

    for (const row of csvData) {
      rowIndex++

      // Get Client Code
      const clientCodeVal = row[clientCol].trim()
      const clientCode = parseInt(clientCodeVal)

      // Get Product Code (Internal Code as string)
      const productCodeRaw = row[productCol].trim()

      // Get Quantity
      const quantityVal = row[qtyCol].trim()
      const quantity = parseFloat(quantityVal.replace(',', '.'))

      // Validation
      if (!clientCode || isNaN(clientCode)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Código do cliente inválido ou faltando ('${clientCodeVal}').`,
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
          `Linha ${rowIndex}: Cliente com código ${clientCode} não encontrado.`,
        )
        continue
      }

      // Product Lookup Logic - Strict matching on codigo_interno
      const productInfo = mapCodigoInterno.get(productCodeRaw)

      if (!productInfo) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Produto com código interno '${productCodeRaw}' não encontrado.`,
        )
        continue
      }

      if (isNaN(quantity)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Quantidade inválida ('${quantityVal}').`,
        )
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
        productName: productInfo.name,
        quantity,
      })
    }

    // 4. Execute Insertions per Client Group
    const today = new Date()
    const dateStr = format(today, 'yyyy-MM-dd')
    const timeStr = format(today, 'HH:mm:ss')
    const isoStr = today.toISOString()

    for (const [clientCode, groupData] of validGroups) {
      try {
        // Reserve Order Number
        const orderId = await bancoDeDadosService.reserveNextOrderNumber()

        // Chunk items if too many (safe margin 500)
        const chunkSize = 500
        for (let i = 0; i < groupData.items.length; i += chunkSize) {
          const chunk = groupData.items.slice(i, i + chunkSize)

          // Prepare BANCO_DE_DADOS inserts
          const bancoInserts = chunk.map((item) => ({
            'NÚMERO DO PEDIDO': orderId,
            'CÓDIGO DO CLIENTE': clientCode,
            CLIENTE: groupData.clientName,
            'COD. PRODUTO': null, // We don't have short CODIGO mapped here reliably if strict mode
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
            FORMA: 'IMPORTAÇÃO CSV',
            CONTAGEM: 0,
            'NOVAS CONSIGNAÇÕES': '0',
            RECOLHIDO: '0',
          }))

          // Prepare AJUSTE_SALDO_INICIAL inserts
          const ajusteInserts = chunk.map((item) => ({
            cliente_id: clientCode,
            cliente_nome: groupData.clientName,
            produto_id: item.productId,
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
        }

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
