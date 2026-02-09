import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from 'https://esm.sh/pdf-lib@1.17.1'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    let dateToParse = dateString
    if (dateString && dateString.length === 10 && !dateString.includes('T')) {
      dateToParse = `${dateString}T12:00:00`
    }
    const date = new Date(dateToParse)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return dateString || '-'
  }
}

const safeFormatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { reportType, format } = body
    const isThermal = format === '80mm'
    const isDetailed = reportType === 'detailed-order'

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page
    let width
    let height
    let margins
    let y

    if (isDetailed) {
      // A4 Landscape for detailed table
      page = pdfDoc.addPage([842, 595]) // A4 Landscape points
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 30, bottom: 30, left: 30, right: 30 }
      y = height - margins.top
    } else if (isThermal) {
      // Thermal 80mm
      const itemsCount = body.items ? body.items.length : 0
      const historyCount = body.history ? body.history.length : 0
      const installmentsCount = body.installments ? body.installments.length : 0
      const detailedPaymentsCount = body.detailedPayments
        ? body.detailedPayments.length
        : 0
      // For closing report
      const expensesCount = body.expenses ? body.expenses.length : 0
      const receiptsCount = body.receipts ? body.receipts.length : 0

      // Calculate variable height
      let estimatedHeight = 600 // Base height

      if (
        reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary'
      ) {
        estimatedHeight += receiptsCount * 20
        estimatedHeight += expensesCount * 20
        estimatedHeight += 300 // summary sections
      } else {
        estimatedHeight += itemsCount * 100 // Items block
        estimatedHeight += installmentsCount * 20
        estimatedHeight += historyCount * 40
      }

      page = pdfDoc.addPage([226, Math.max(400, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // Default A4 Portrait
      page = pdfDoc.addPage()
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 40, bottom: 40, left: 40, right: 40 }
      y = height - margins.top
    }

    const drawText = (
      text: string,
      x: number,
      yPos: number,
      options: {
        size?: number
        font?: any
        align?: 'left' | 'right' | 'center'
        color?: any
        rotate?: any
        maxWidth?: number
      } = {},
    ) => {
      const {
        size = 10,
        font = fontRegular,
        align = 'left',
        color = rgb(0, 0, 0),
        rotate = undefined,
        maxWidth = undefined,
      } = options

      const finalFont = font
      const cleanText = removeAccents(text || '')
      let textToDraw = cleanText

      if (maxWidth) {
        const textWidth = finalFont.widthOfTextAtSize(cleanText, size)
        if (textWidth > maxWidth) {
          const avgCharWidth = textWidth / cleanText.length
          const maxChars = Math.floor(maxWidth / avgCharWidth)
          textToDraw = cleanText.substring(0, Math.max(0, maxChars - 3)) + '...'
        }
      }

      const textWidth = finalFont.widthOfTextAtSize(textToDraw, size)
      let xPos = x
      if (!rotate) {
        if (align === 'right') xPos = x - textWidth
        if (align === 'center') xPos = x - textWidth / 2
      }

      page.drawText(textToDraw, {
        x: xPos,
        y: yPos,
        size,
        font: finalFont,
        color,
        rotate,
      })
      return textWidth
    }

    const drawLine = (yPos: number, thickness = 1) => {
      page.drawLine({
        start: { x: margins.left, y: yPos },
        end: { x: width - margins.right, y: yPos },
        thickness,
        color: rgb(0, 0, 0),
      })
    }

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        if (isDetailed) {
          page = pdfDoc.addPage([842, 595])
        } else if (isThermal) {
          page = pdfDoc.addPage([width, height])
        } else {
          page = pdfDoc.addPage()
        }
        y = height - margins.top
        return true
      }
      return false
    }

    if (reportType === 'detailed-order') {
      // --- DETAILED ORDER (A4 LANDSCAPE) ---
      // Keeping existing implementation for Green button (Standard/Detailed) if needed,
      // or if "Finalizar Acerto" uses this type.
      // The user story focuses on "Finalizar Acerto PDF layout to match the provided PEDIDO template".
      // Assuming "PEDIDO" template provided is the vertical one (80mm) because the other is "Fechamento de Caixa".
      // If reportType is 'detailed-order' but format is '80mm', we should render the thermal version.
      // However, usually 'detailed-order' implies the big grid.
      // Let's assume if format is 80mm, we use the thermal layout regardless of reportType name variations for orders.
    }

    if (
      isThermal &&
      (reportType === 'thermal-history' ||
        reportType === 'detailed-order' ||
        reportType === 'acerto')
    ) {
      // --- THERMAL ORDER SETTLEMENT (PEDIDO) ---
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        installments = [],
        history = [],
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = `${client?.MUNICÍPIO || ''} - ${client?.ESTADO || ''}` // Assuming ESTADO exists or blank

      // 1. Header
      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText(`PEDIDO ${orderNumber}`, width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      // Client & Info
      const infoSize = 9
      drawText(`Cliente: ${clientCode} - ${clientName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
        maxWidth: width - 20,
      })
      y -= 12
      drawText(`End: ${clientAddress}`, margins.left, y, {
        size: infoSize,
        maxWidth: width - 20,
      })
      y -= 12
      drawText(clientCity, margins.left, y, { size: infoSize, font: fontBold })
      y -= 12

      const formattedDate = safeFormatDate(date)
      const formattedTime = safeFormatTime(date)
      drawText(`Data: ${formattedDate} ${formattedTime}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
      })
      y -= 12
      drawText(`Vendedor: ${sellerName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
      })
      y -= 15
      drawLine(y)
      y -= 15

      // 2. Items Section (ITENS DO PEDIDO)
      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const item of items) {
        checkPageBreak(80)

        // Product Name and Price line
        drawText(`${item.produtoNome}`, margins.left, y, {
          size: 9,
          font: fontBold,
          maxWidth: width - 70,
        })
        drawText(
          `R$ ${formatCurrency(item.precoUnitario || 0)}`,
          width - margins.right,
          y,
          { size: 9, align: 'right' },
        )
        y -= 12

        // Stats grid
        const drawStat = (label: string, val: any, x: number) => {
          drawText(label, x, y, { size: 8 })
          drawText(String(val), width - margins.right, y, {
            size: 8,
            align: 'right',
          })
        }

        drawText('Saldo Inicial:', margins.left, y, { size: 8 })
        drawText(String(item.saldoInicial), width - margins.right, y, {
          size: 8,
          align: 'right',
        })
        y -= 10

        drawText('Contagem:', margins.left, y, { size: 8 })
        drawText(String(item.contagem), width - margins.right, y, {
          size: 8,
          align: 'right',
        })
        y -= 10

        drawText('Qtd. Vendida:', margins.left, y, { size: 8 })
        drawText(String(item.quantVendida), width - margins.right, y, {
          size: 8,
          align: 'right',
        })
        y -= 10

        drawText('Saldo Final:', margins.left, y, { size: 8 })
        drawText(String(item.saldoFinal), width - margins.right, y, {
          size: 8,
          align: 'right',
        })
        y -= 10

        drawText('Total:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(item.valorVendido)}`,
          width - margins.right,
          y,
          { size: 9, font: fontBold, align: 'right' },
        )
        y -= 15
      }

      drawLine(y)
      y -= 15

      // 3. Totals Section
      const drawTotalRow = (label: string, val: number, isBold = false) => {
        drawText(label, margins.left, y, {
          size: 9,
          font: isBold ? fontBold : fontRegular,
        })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 9,
          font: isBold ? fontBold : fontRegular,
          align: 'right',
        })
        y -= 15
      }

      drawTotalRow('Total Vendido:', totalVendido)
      drawTotalRow('Desconto:', valorDesconto)
      y -= 5
      drawTotalRow('TOTAL A PAGAR:', valorAcerto, true)
      y -= 15
      drawLine(y)
      y -= 15

      // 4. Installments Section (VALORES A PAGAR)
      if (installments.length > 0) {
        checkPageBreak(60)
        drawText('VALORES A PAGAR (PARCELAS)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Headers
        drawText('Forma', margins.left, y, { size: 8, font: fontBold })
        drawText('Vencimento', margins.left + 70, y, {
          size: 8,
          font: fontBold,
        })
        drawText('Valor', width - margins.right, y, {
          size: 8,
          font: fontBold,
          align: 'right',
        })
        y -= 5
        drawLine(y, 0.5)
        y -= 12

        let totalInstallments = 0
        installments.forEach((inst: any) => {
          checkPageBreak(20)
          const method = (inst.method || 'Outros').substring(0, 12)
          const dateStr = safeFormatDate(inst.dueDate)

          drawText(method, margins.left, y, { size: 8 })
          drawText(dateStr, margins.left + 70, y, { size: 8 })
          drawText(
            `R$ ${formatCurrency(inst.value)}`,
            width - margins.right,
            y,
            { size: 8, align: 'right' },
          )
          y -= 12
          totalInstallments += inst.value
        })

        y -= 5
        drawLine(y, 0.5)
        y -= 12
        drawText('Total a Pagar:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(totalInstallments)}`,
          width - margins.right,
          y,
          { size: 9, font: fontBold, align: 'right' },
        )
        y -= 25
      }

      // 5. Signature
      checkPageBreak(60)
      y -= 30
      drawLine(y)
      y -= 15
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
      y -= 25

      // 6. History Section (RESUMO DE ACERTOS)
      if (history && history.length > 0) {
        checkPageBreak(100)
        drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        history.forEach((h: any) => {
          checkPageBreak(40)
          const dateStr = safeFormatDate(h.data)
          const orderId = h.id ? `#${h.id}` : '-'
          const vendor = h.vendedor ? h.vendedor.split(' ')[0] : 'N/D'

          // Line 1: Date | #ID | Vendor
          drawText(dateStr, margins.left, y, { size: 8, font: fontBold })
          drawText(orderId, margins.left + 60, y, { size: 8 })
          drawText(vendor, width - margins.right, y, {
            size: 8,
            align: 'right',
          })
          y -= 10

          // Line 2: V: Val | A Pagar: Val
          drawText(
            `V: ${formatCurrency(h.valorVendaTotal || 0)}`,
            margins.left,
            y,
            { size: 8 },
          )
          drawText(
            `A Pagar: ${formatCurrency(h.saldoAPagar || 0)}`,
            width - margins.right,
            y,
            { size: 8, font: fontBold, align: 'right' },
          )
          y -= 10

          // Line 3: Pg: Val | Deb: Val | Med: Val
          drawText(`Pg: ${formatCurrency(h.valorPago || 0)}`, margins.left, y, {
            size: 8,
          })

          const debVal = h.debito || 0
          const debColor = debVal > 0.05 ? rgb(0.8, 0, 0) : rgb(0, 0, 0)

          drawText(`Deb: ${formatCurrency(debVal)}`, margins.left + 70, y, {
            size: 8,
            color: debColor,
            font: debVal > 0.05 ? fontBold : fontRegular,
          })

          drawText(
            `Med: ${formatCurrency(h.mediaMensal || 0)}`,
            width - margins.right,
            y,
            { size: 8, align: 'right', color: rgb(0, 0, 0.6) },
          )

          y -= 5
          drawLine(y, 0.5)
          y -= 10
        })
      }
    } else if (
      isThermal &&
      (reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary')
    ) {
      // --- CASHIER CLOSURE (FECHAMENTO DE CAIXA) ---
      const { fechamento, receipts = [], expenses = [], date } = body

      const closingData = fechamento || body.data || {}
      const empName = closingData.funcionario?.nome_completo || 'Funcionario'
      const rotaId = closingData.rota_id || '-'
      const formattedDate = safeFormatDate(date)
      const formattedTime = safeFormatTime(date)

      // Header
      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText('FECHAMENTO DE CAIXA', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      drawText(`Data: ${formattedDate} ${formattedTime}`, margins.left, y, {
        size: 9,
      })
      y -= 12
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 9,
        font: fontBold,
      })
      y -= 12
      drawText(`Rota ID: ${rotaId}`, margins.left, y, { size: 9 })
      y -= 15
      drawLine(y)
      y -= 15

      // Main Balance
      drawText('SALDO DO ACERTO', margins.left, y, { size: 12, font: fontBold })
      drawText(
        `R$ ${formatCurrency(closingData.saldo_acerto || 0)}`,
        width - margins.right,
        y,
        { size: 14, font: fontBold, align: 'right' },
      )
      y -= 25
      drawLine(y, 0.5)
      y -= 15

      // Entry Summary (RESUMO DE ENTRADA)
      drawText('RESUMO DE ENTRADA', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      const drawEntryRow = (label: string, val: number) => {
        drawText(label, margins.left, y, { size: 9 })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 9,
          align: 'right',
        })
        y -= 12
      }

      drawEntryRow('Dinheiro:', closingData.valor_dinheiro || 0)
      drawEntryRow('Pix:', closingData.valor_pix || 0)
      drawEntryRow('Cheque:', closingData.valor_cheque || 0)
      y -= 5
      const totalEntrada =
        (closingData.valor_dinheiro || 0) +
        (closingData.valor_pix || 0) +
        (closingData.valor_cheque || 0)
      drawText('TOTAL ENTRADA:', margins.left, y, { size: 9, font: fontBold })
      drawText(`R$ ${formatCurrency(totalEntrada)}`, width - margins.right, y, {
        size: 9,
        font: fontBold,
        align: 'right',
      })
      y -= 15
      drawLine(y)
      y -= 15

      // Exit Summary (DETALHAMENTO DA SAIDA)
      drawText('DETALHAMENTO DA SAIDA', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      // Optional: List expenses if needed? Template says "TOTAL SAIDA (DESPESAS)"
      // We can list top expenses or just total. Template implies just total based on brevity, but "Detalhamento" implies details.
      // Let's list details if available, then total.

      // Filter only "saiu_do_caixa" expenses for accuracy
      const cashExpenses = expenses.filter((e: any) => e.saiuDoCaixa !== false)

      /* Detailed list optional - commented out to match brief template example more closely, or enable if desired
      cashExpenses.forEach((e: any) => {
         checkPageBreak(20)
         drawText(e.detalhamento?.substring(0, 20) || 'Despesa', margins.left, y, { size: 8 })
         drawText(`R$ ${formatCurrency(e.valor)}`, width - margins.right, y, { size: 8, align: 'right' })
         y -= 10
      })
      if (cashExpenses.length > 0) y -= 5
      */

      drawText('TOTAL SAIDA (DESPESAS):', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      drawText(
        `R$ ${formatCurrency(closingData.valor_despesas || 0)}`,
        width - margins.right,
        y,
        { size: 9, font: fontBold, align: 'right' },
      )
      y -= 15
      drawLine(y)
      y -= 15

      // Settlement Summary (DETALHAMENTO DO ACERTO)
      drawText('DETALHAMENTO DO ACERTO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      drawEntryRow('Venda Total:', closingData.venda_total || 0)
      drawEntryRow('Desconto Total:', closingData.desconto_total || 0)

      y -= 15
      drawLine(y)
    }

    const pdfBytes = await pdfDoc.save()
    return new Response(pdfBytes, {
      headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
