import { supabase } from '@/lib/supabase/client'
import { PixTransactionRow } from '@/types/pix'
import { parseCurrency } from '@/lib/formatters'

export const pixService = {
  async getPixTransactions(): Promise<PixTransactionRow[]> {
    // 1. Fetch Orders from BANCO_DE_DADOS (Acerto context)
    // We look for orders that might have Pix
    // We fetch a reasonable amount of history (e.g. 5000 rows)
    const { data: ordersData, error: ordersError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "FUNCIONÁRIO", "VALOR VENDIDO", "DETALHES_PAGAMENTO", "FORMA", "pix_acerto_confirmado"',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(5000)

    if (ordersError) throw ordersError

    // 2. Fetch Receipts from RECEBIMENTOS (Recebimento context)
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('RECEBIMENTOS')
      .select(
        'venda_id, valor_pago, forma_pagamento, pix_recebimento_confirmado',
      )
      .ilike('forma_pagamento', 'Pix')
      .limit(5000)

    if (receiptsError) throw receiptsError

    const ordersMap = new Map<number, PixTransactionRow>()

    // Process Acerto Data
    ordersData?.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      let pixValue = 0

      // Extract Pix value from DETALHES_PAGAMENTO (JSON)
      if (row['DETALHES_PAGAMENTO']) {
        const details = row['DETALHES_PAGAMENTO'] as any[]
        if (Array.isArray(details)) {
          details.forEach((p) => {
            if (p.method === 'Pix') {
              pixValue += p.paidValue || 0
            }
          })
        }
      } else if (row['FORMA']) {
        // Fallback: Parse FORMA string if JSON is missing
        // Example: "Pix Reg: R$ 100,00 Pago: R$ 100,00"
        const forma = row['FORMA'] as string
        if (forma.includes('Pix')) {
          // Simplistic extraction if needed, or just assume order total if only Pix
          // But safer to rely on JSON. If JSON missing, we might skip or try regex
          // For now, let's trust JSON is populated for new records, and older might be mixed.
          // If we can't parse reliable value, we might set 0 or total if purely Pix.
          // Let's try a regex for "Pix ... Pago: R$ X"
          const match = forma.match(/Pix.*?Pago:\s*R\$\s*([\d.,]+)/)
          if (match && match[1]) {
            pixValue += parseCurrency(match[1])
          }
        }
      }

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId,
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          employeeName: row['FUNCIONÁRIO'] || 'N/D',
          acertoPixValue: 0,
          acertoPixConfirmed: !!row['pix_acerto_confirmado'],
          recebimentoPixValue: 0,
          recebimentoPixConfirmed: false, // Will calculate based on receipts
        })
      }

      // Aggregate Acerto Pix Value (in case of multiple rows per order in BANCO_DE_DADOS)
      // Note: BANCO_DE_DADOS has one row per item. Payment details are duplicated per row in current saveTransaction logic
      // So we should NOT sum them up for every row. We should take it from one row per order.
      // Since we iterate all rows, we need to be careful.
      // Strategy: Only add if not already added? Or overwrite?
      // Since all rows for an order carry the same payment details, we can just overwrite/set.
      const entry = ordersMap.get(orderId)!
      entry.acertoPixValue = pixValue
      // Also update confirmation status (should be consistent across rows)
      entry.acertoPixConfirmed = !!row['pix_acerto_confirmado']
    })

    // Process Recebimentos Data
    const receiptOrderIds = new Set<number>()
    const orderReceiptsStatus = new Map<number, boolean[]>()

    receiptsData?.forEach((rec: any) => {
      const orderId = rec.venda_id
      if (!orderId) return

      receiptOrderIds.add(orderId)

      // If order exists in map (from Acerto), update it
      // If not (maybe old order or created differently), we might need to fetch info?
      // For now, only show if we have Order Info from BANCO_DE_DADOS or if we fetch it separately.
      // The query to BANCO_DE_DADOS covered recent orders. If a receipt is for an old order not in that list,
      // we might miss client name. For this implementation, we rely on the overlap or the limited history.
      // Ideally we would fetch missing order details.

      if (!ordersMap.has(orderId)) {
        // Placeholder if order info is missing from the recent fetch
        ordersMap.set(orderId, {
          orderId,
          clientCode: 0,
          clientName: 'Carregando...',
          employeeName: '-',
          acertoPixValue: 0,
          acertoPixConfirmed: false,
          recebimentoPixValue: 0,
          recebimentoPixConfirmed: false,
        })
      }

      const entry = ordersMap.get(orderId)!
      entry.recebimentoPixValue += rec.valor_pago || 0

      // Track confirmation status
      if (!orderReceiptsStatus.has(orderId)) {
        orderReceiptsStatus.set(orderId, [])
      }
      orderReceiptsStatus.get(orderId)?.push(!!rec.pix_recebimento_confirmado)
    })

    // Determine aggregate confirmation status for Receipts
    // If ALL Pix receipts for the order are confirmed, we consider it confirmed.
    orderReceiptsStatus.forEach((statuses, orderId) => {
      const entry = ordersMap.get(orderId)
      if (entry) {
        entry.recebimentoPixConfirmed =
          statuses.length > 0 && statuses.every((s) => s)
      }
    })

    // If we have placeholder orders, we might want to fetch their details (optional optimization)
    // For now, we filter out rows that have NO Pix value in either column
    return Array.from(ordersMap.values())
      .filter((row) => row.acertoPixValue > 0 || row.recebimentoPixValue > 0)
      .sort((a, b) => b.orderId - a.orderId)
  },

  async toggleAcertoPix(orderId: number, confirmed: boolean) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ pix_acerto_confirmado: confirmed } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },

  async toggleRecebimentoPix(orderId: number, confirmed: boolean) {
    // Updates all Pix receipts for this order
    const { error } = await supabase
      .from('RECEBIMENTOS')
      .update({ pix_recebimento_confirmado: confirmed } as any)
      .eq('venda_id', orderId)
      .ilike('forma_pagamento', 'Pix')

    if (error) throw error
  },
}
