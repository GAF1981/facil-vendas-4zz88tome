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
    const { reportType, format, data } = body
    const isThermal = format === '80mm'

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page
    let width
    let height
    let margins
    let y

    // Height Calculation Logic
    let estimatedHeight = 842 // Default A4 height
    if (isThermal) {
      if (reportType === 'closing-confirmation') {
        const expensesCount = body.expenses ? body.expenses.length : 0
        const settlementsCount = body.settlements ? body.settlements.length : 0
        // Approx: Header(100) + Input(100) + Expense(50 + count*20) + Acerto(50) + Table(settlements * 50) + Footer(50)
        estimatedHeight =
          400 + expensesCount * 20 + (settlementsCount || 0) * 80
      } else if (reportType === 'receipt') {
        estimatedHeight = 400
      } else if (!reportType || reportType === 'acerto') {
        // Acerto Receipt logic
        const itemsCount = body.items ? body.items.length : 0
        const historyCount = body.history ? body.history.length : 0
        const paymentsCount = body.payments ? body.payments.length : 0
        let installmentsCount = 0
        if (body.payments) {
          body.payments.forEach((p: any) => {
            if (p.details) installmentsCount += p.details.length
            else installmentsCount += 1
          })
        }
        // Increased height estimation per section to accommodate details
        estimatedHeight =
          450 + // Header + Info
          itemsCount * 100 + // Items with details
          paymentsCount * 40 +
          installmentsCount * 30 +
          historyCount * 160 + // History blocks
          300 // Footer
      }

      page = pdfDoc.addPage([226, Math.max(400, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // A4 Format
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

      const finalFont = isThermal ? fontBold : font
      const finalColor = isThermal ? rgb(0, 0, 0) : color
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
        color: finalColor,
        rotate,
      })
      return textWidth
    }

    const drawLine = (yPos: number) => {
      page.drawLine({
        start: { x: margins.left, y: yPos },
        end: { x: width - margins.right, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
    }

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        if (isThermal) {
          page = pdfDoc.addPage([width, height])
        } else {
          page = pdfDoc.addPage()
        }
        y = height - margins.top
        return true
      }
      return false
    }

    // --- REPORT TYPES LOGIC ---

    if (
      isThermal &&
      (!reportType || reportType === 'acerto' || reportType === 'receipt')
    ) {
      // --- THERMAL 80MM ACERTO/RECEIPT LAYOUT ---
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        valorPago = 0,
        debito = 0,
        payments = [],
        history = [],
        signature,
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = `${client?.MUNICÍPIO || ''}`

      // Header
      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText(`PEDIDO ${orderNumber || 'N/D'}`, width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 10
      drawLine(y)
      y -= 15

      // Client Info
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
      drawText(`${clientCity}`, margins.left, y, { size: infoSize })
      y -= 12
      drawText(
        `Data: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
        margins.left,
        y,
        { size: infoSize },
      )
      y -= 12
      drawText(`Vendedor: ${sellerName}`, margins.left, y, {
        size: infoSize,
        maxWidth: width - 20,
      })
      y -= 10
      drawLine(y)
      y -= 15

      // Items Section
      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const item of items) {
        checkPageBreak(100)
        // Product Line
        const priceStr = `R$ ${formatCurrency(item.precoUnitario)}`
        drawText(`${item.produtoNome}`, margins.left, y, {
          size: 9,
          font: fontBold,
          maxWidth: width - 80,
        })
        drawText(priceStr, width - margins.right, y, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        y -= 12

        // Details
        const drawDetail = (label: string, val: any) => {
          drawText(label, margins.left, y, { size: 9 })
          drawText(String(val), width - margins.right, y, {
            size: 9,
            align: 'right',
          })
          y -= 11
        }

        drawDetail('Saldo Inicial:', item.saldoInicial)
        drawDetail('Contagem:', item.contagem)
        drawDetail('Qtd. Vendida:', item.quantVendida)
        drawDetail('Saldo Final:', item.saldoFinal)

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

      // Totals
      const drawTotal = (label: string, val: number, isBig = false) => {
        const f = isBig ? fontBold : fontRegular
        drawText(label, margins.left, y, { size: 9, font: f })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 9,
          font: f,
          align: 'right',
        })
        y -= 12
      }

      drawTotal('Total Vendido:', totalVendido)
      drawTotal('Desconto:', valorDesconto)
      y -= 2
      drawTotal('TOTAL A PAGAR:', valorAcerto, true)
      y -= 15
      drawLine(y)
      y -= 15

      // Payments
      drawText('PAGAMENTOS', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      let hasImmediate = false
      for (const p of payments) {
        if (p.paidValue > 0) {
          drawText(`${p.method} - Hoje`, margins.left, y, { size: 9 })
          drawText(
            `R$ ${formatCurrency(p.paidValue)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 12
          hasImmediate = true
        }
      }
      if (!hasImmediate) {
        drawText('Nenhum pagamento imediato.', margins.left, y, {
          size: 9,
          font: fontBold,
        })
        y -= 15
      }
      y -= 5
      drawLine(y)
      y -= 15

      // A PAGAR (Scheduled)
      drawText('A PAGAR', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      let hasScheduled = false
      for (const p of payments) {
        if (p.details && p.details.length > 0) {
          for (const d of p.details) {
            // Robust UTC parsing from YYYY-MM-DD
            // If date is provided (YYYY-MM-DD), use Date.UTC to ensure correct day
            const parts = d.dueDate.split('-')
            let dueTime = 0
            if (parts.length === 3) {
              const yNum = parseInt(parts[0])
              const mNum = parseInt(parts[1]) - 1
              const dNum = parseInt(parts[2])
              dueTime = Date.UTC(yNum, mNum, dNum)
            } else {
              dueTime = new Date(d.dueDate).getTime()
            }

            const now = new Date()
            const todayUTC = Date.UTC(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            )

            // If due date is today or future, AND it's not fully paid (to avoid duplicating immediate payments)
            if (dueTime >= todayUTC) {
              if (d.paidValue < d.value) {
                hasScheduled = true
                checkPageBreak(20)
                const label = `${p.method} (${d.number}/${p.installments}) - ${safeFormatDate(d.dueDate)}`
                drawText(label, margins.left, y, {
                  size: 9,
                  maxWidth: width - 80,
                })
                drawText(
                  `R$ ${formatCurrency(d.value)}`,
                  width - margins.right,
                  y,
                  { size: 9, align: 'right' },
                )
                y -= 12
              }
            }
          }
        }
      }

      if (!hasScheduled) {
        if (debito > 0.01) {
          drawText('Saldo Devedor Pendente.', margins.left, y, { size: 9 })
          y -= 12
        } else {
          drawText('Nenhum pagamento agendado.', margins.left, y, { size: 9 })
          y -= 12
        }
      }
      y -= 5
      drawLine(y)
      y -= 15

      // Financial Summary
      drawText('RESUMO FINANCEIRO', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      y -= 15
      drawText('Valor Total Pago (Hoje):', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(valorPago)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
        font: fontBold,
      })
      y -= 12
      drawText('RESTANTE (DEBITO):', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(debito)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
        font: fontBold,
      })
      y -= 15
      drawLine(y)
      y -= 15

      // Settlement History
      drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const h of history) {
        checkPageBreak(120)

        const drawHistLine = (l: string, v: string | number) => {
          drawText(l, margins.left, y, { size: 9, font: fontBold })
          drawText(String(v), width - margins.right, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          y -= 11
        }

        drawHistLine('Data:', safeFormatDate(h.data))
        drawHistLine('Venda:', `R$ ${formatCurrency(h.valorVendaTotal)}`)
        drawHistLine('Desconto:', `R$ ${formatCurrency(h.desconto || 0)}`)
        drawHistLine('A pagar:', `R$ ${formatCurrency(h.saldoAPagar)}`)
        drawHistLine('Pago:', `R$ ${formatCurrency(h.valorPago)}`)
        drawHistLine('Debito:', `R$ ${formatCurrency(h.debito)}`)

        drawText('Vendedor:', margins.left, y, { size: 9, font: fontBold })
        drawText(h.vendedor || '-', width - margins.right, y, {
          size: 9,
          align: 'right',
          font: fontBold,
          maxWidth: 120,
        })
        y -= 11

        drawHistLine(
          'Media Mensal:',
          `R$ ${formatCurrency(h.mediaMensal || 0)}`,
        )
        drawHistLine('Pedido:', `#${h.id}`)

        y -= 8 // Spacing between blocks
      }

      drawLine(y)
      y -= 30

      // Footer / Signature
      checkPageBreak(50)
      const sigLineY = y
      page.drawLine({
        start: { x: margins.left + 20, y: sigLineY },
        end: { x: width - margins.right - 20, y: sigLineY },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      y -= 15
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
      y -= 12
      drawText(`Emitido por: ${sellerName}`, width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
    } else if (reportType === 'closing-confirmation') {
      // --- CLOSING CONFIRMATION LAYOUT UPDATE ---
      const {
        fechamento,
        receipts,
        expenses,
        settlements = [],
        date: closingDate,
      } = body
      const closingData = fechamento || body.data

      if (!closingData) throw new Error('No closing data provided')
      const empName = closingData.funcionario?.nome_completo || 'N/D'

      drawText('FACIL VENDAS', width / 2, y, {
        size: isThermal ? 14 : 18,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText('FECHAMENTO DE CAIXA', width / 2, y, {
        size: isThermal ? 12 : 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      drawText(
        `Data: ${safeFormatDate(closingDate)} ${safeFormatTime(closingDate)}`,
        margins.left,
        y,
        { size: 10 },
      )
      y -= 15
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15
      drawText(`Rota ID: ${closingData.rota_id}`, margins.left, y, { size: 10 })
      y -= 15
      drawLine(y)
      y -= 20

      // SECTION 1: Resumo de Entrada (Inputs)
      drawText('RESUMO DE ENTRADA', width / 2, y, {
        size: 11,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      const drawRow = (l: string, v: number, bold = false) => {
        const f = bold ? fontBold : fontRegular
        drawText(l, margins.left, y, { size: 10, font: f })
        drawText(`R$ ${formatCurrency(v)}`, width - margins.right, y, {
          size: 10,
          align: 'right',
          font: f,
        })
        y -= 15
      }

      drawRow('Dinheiro:', closingData.valor_dinheiro)
      drawRow('Pix:', closingData.valor_pix)
      drawRow('Cheque:', closingData.valor_cheque)
      y -= 5
      const totalEntrada =
        closingData.valor_dinheiro +
        closingData.valor_pix +
        closingData.valor_cheque
      drawRow('TOTAL ENTRADA:', totalEntrada, true)
      y -= 10
      drawLine(y)
      y -= 20

      // SECTION 2: Detalhamento da Saída (Expenses)
      drawText('DETALHAMENTO DA SAÍDA', width / 2, y, {
        size: 11,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      if (expenses && expenses.length > 0) {
        expenses.forEach((exp: any) => {
          checkPageBreak(20)
          const desc = `${exp.grupo} - ${exp.detalhamento || ''}`
          drawText(desc, margins.left, y, { size: 9, maxWidth: width - 80 })
          drawText(
            `R$ ${formatCurrency(exp.valor)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 12
        })
      }
      y -= 5
      drawRow('TOTAL SAÍDA (DESPESAS):', closingData.valor_despesas, true)
      y -= 10
      drawLine(y)
      y -= 20

      // SECTION 3: Detalhamento do Acerto & Highlighted Total
      drawText('DETALHAMENTO DO ACERTO', width / 2, y, {
        size: 11,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawRow('Venda Total:', closingData.venda_total)
      drawRow('Desconto Total:', closingData.desconto_total)
      y -= 5

      // Big Highlighted Saldo do Acerto
      y -= 10
      drawText('SALDO DO ACERTO', margins.left, y, {
        size: 12,
        font: fontBold,
      })
      drawText(
        `R$ ${formatCurrency(closingData.saldo_acerto)}`,
        width - margins.right,
        y,
        { size: 14, font: fontBold, align: 'right', color: rgb(0, 0, 0) },
      )
      y -= 25
      drawLine(y)
      y -= 20

      // SECTION 4: Resumo dos Acertos (Table)
      if (settlements && settlements.length > 0) {
        checkPageBreak(50)
        drawText('RESUMO DOS ACERTOS', width / 2, y, {
          size: 11,
          font: fontBold,
          align: 'center',
        })
        y -= 20

        // Table Header
        // New columns: Ped, Data, Func, Cod, Cli, Vl.Venda, Pagto(BD), Pagto(Rec), Vl.Pago
        const cols = [
          { name: 'Ped', x: 0 },
          { name: 'Data', x: 30 },
          { name: 'Func', x: 80 },
          { name: 'Cod', x: 140 },
          { name: 'Cliente', x: 170 },
          { name: 'Vl.Venda', x: 280, align: 'right' },
          { name: 'Pgto (BD)', x: 330 },
          { name: 'Pgto (Rec)', x: 400 },
          { name: 'Vl.Pago', x: 480, align: 'right' },
        ]

        if (isThermal) {
          // Simplified header for thermal
          drawText('Detalhamento disponível apenas em A4', margins.left, y, {
            size: 9,
          })
          y -= 15
        } else {
          // A4 Table Header
          const startX = margins.left
          const colX = (offset: number) => startX + offset

          // Draw Header Background
          page.drawRectangle({
            x: startX,
            y: y - 2,
            width: width - margins.left - margins.right,
            height: 14,
            color: rgb(0.9, 0.9, 0.9),
          })

          drawText('Ped', colX(0), y, { size: 7, font: fontBold })
          drawText('Data', colX(30), y, { size: 7, font: fontBold })
          drawText('Func', colX(80), y, { size: 7, font: fontBold })
          drawText('Cod', colX(140), y, { size: 7, font: fontBold })
          drawText('Cliente', colX(170), y, { size: 7, font: fontBold })
          drawText('Vl.Venda', colX(330), y, {
            size: 7,
            font: fontBold,
            align: 'right',
          })
          drawText('Pgto(BD)', colX(340), y, { size: 7, font: fontBold })
          drawText('Pgto(Rec)', colX(410), y, { size: 7, font: fontBold })
          drawText('Vl.Pago', colX(515), y, {
            size: 7,
            font: fontBold,
            align: 'right',
          })

          y -= 15

          for (const s of settlements) {
            checkPageBreak(15)
            // Row Data
            const dateStr = `${safeFormatDate(s.acertoDate)}`
            const timeStr = s.acertoTime?.substring(0, 5) || ''
            const empStr = (s.employee || '').split(' ')[0].substring(0, 10)
            const clientStr = (s.clientName || '').substring(0, 18)
            const payMethodBD = (s.paymentFormsBD || '').substring(0, 12)
            const payMethodRec = s.payments
              ? s.payments.map((p: any) => p.method).join(',')
              : ''
            const payMethodRecStr = payMethodRec.substring(0, 12)

            drawText(`#${s.orderId}`, colX(0), y, { size: 7 })
            drawText(`${dateStr} ${timeStr}`, colX(30), y, { size: 6 })
            drawText(empStr, colX(80), y, { size: 7 })
            drawText(String(s.clientCode), colX(140), y, { size: 7 })
            drawText(clientStr, colX(170), y, { size: 7 })
            drawText(formatCurrency(s.totalSalesValue), colX(330), y, {
              size: 7,
              align: 'right',
            })
            drawText(payMethodBD, colX(340), y, { size: 6 })
            drawText(payMethodRecStr, colX(410), y, { size: 6 })
            drawText(formatCurrency(s.totalPaid), colX(515), y, {
              size: 7,
              align: 'right',
            })
            y -= 12
          }
        }
      }
    } else {
      drawText('Relatório não suportado.', margins.left, y)
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
