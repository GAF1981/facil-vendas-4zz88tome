import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const formatCurrency = (value: number) => {
  return value.toFixed(2).replace('.', ',')
}

const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateString || '-'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { reportType } = body

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const margins = { top: 50, bottom: 50, left: 40, right: 40 }
    let y = height - margins.top

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
      } = {},
    ) => {
      const {
        size = 10,
        font = fontRegular,
        align = 'left',
        color = rgb(0, 0, 0),
        rotate = undefined,
      } = options
      const cleanText = removeAccents(text || '')
      const textWidth = font.widthOfTextAtSize(cleanText, size)
      let xPos = x
      if (!rotate) {
        if (align === 'right') xPos = x - textWidth
        if (align === 'center') xPos = x - textWidth / 2
      }
      page.drawText(cleanText, { x: xPos, y: yPos, size, font, color, rotate })
      return textWidth
    }

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        page = pdfDoc.addPage()
        y = height - margins.top
        return true
      }
      return false
    }

    if (
      reportType !== 'closing-confirmation' &&
      reportType !== 'cash-summary' &&
      reportType !== 'employee-cash-summary'
    ) {
      // --- ACERTO / RECEIPT ---
      const {
        client,
        employee,
        items,
        date,
        acertoTipo,
        totalVendido,
        valorDesconto,
        valorAcerto,
        valorPago,
        debito,
        payments,
        history,
        preview,
        signature,
        orderNumber,
        isReceipt,
        issuerName,
        lastOrder,
      } = body

      if (preview) {
        drawText('PDF para visualização', width / 2, y + 20, {
          size: 14,
          font: fontBold,
          align: 'center',
          color: rgb(1, 0, 0),
        })
        y -= 10
      }

      const title = isReceipt
        ? 'RECIBO DE PAGAMENTO'
        : `Comprovante de ${acertoTipo}`

      // Header with Company/Client Info
      drawText('FACIL VENDAS', margins.left, y, { size: 18, font: fontBold })
      drawText(title, width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 25

      drawText(`Data: ${safeFormatDate(date)}`, margins.left, y, { size: 10 })

      if (orderNumber) {
        drawText(`PEDIDO: ${orderNumber}`, margins.left + 150, y, {
          size: 10,
          font: fontBold,
        })
      }

      drawText(
        `Vendedor: ${employee.nome_completo}`,
        width - margins.right,
        y,
        { size: 10, align: 'right' },
      )
      y -= 15

      // Client Box with Extra Info
      const boxHeight = 75
      page.drawRectangle({
        x: margins.left,
        y: y - boxHeight,
        width: width - margins.left - margins.right,
        height: boxHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      })
      const textY = y - 15
      drawText(
        `Cliente: ${client['NOME CLIENTE']} (Cod: ${client.CODIGO})`,
        margins.left + 10,
        textY,
        { size: 10, font: fontBold },
      )
      drawText(
        `CNPJ/CPF: ${client.CNPJ || '-'}`,
        margins.left + 10,
        textY - 15,
        { size: 9 },
      )
      drawText(
        `Telefone: ${client['FONE 1'] || '-'}`,
        margins.left + 10,
        textY - 30,
        { size: 9 },
      )
      drawText(
        `Endereço: ${client.ENDEREÇO || '-'}, ${client.BAIRRO || ''}`,
        margins.left + 10,
        textY - 45,
        { size: 9 },
      )

      // Last Order Info
      if (lastOrder) {
        drawText(
          `Ultimo Pedido: #${lastOrder.id} (${safeFormatDate(lastOrder.date)})`,
          width - margins.right - 10,
          textY,
          { size: 9, align: 'right', font: fontBold },
        )
      }

      y -= boxHeight + 20

      // Items Table
      if (items && items.length > 0) {
        drawText('ITENS DO PEDIDO', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 15

        const colX = {
          prod: margins.left,
          qtd: 350,
          unit: 420,
          total: width - margins.right,
        }

        drawText('Produto', colX.prod, y, { size: 9, font: fontBold })
        drawText('Qtd', colX.qtd, y, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        drawText('Unit.', colX.unit, y, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        drawText('Total', colX.total, y, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        y -= 5
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: width - margins.right, y },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        })
        y -= 12

        for (const item of items) {
          if (checkPageBreak(20)) y -= 20
          drawText(item.produtoNome.substring(0, 45), colX.prod, y, { size: 9 })
          drawText(String(item.quantVendida), colX.qtd, y, {
            size: 9,
            align: 'right',
          })
          drawText(formatCurrency(item.precoUnitario), colX.unit, y, {
            size: 9,
            align: 'right',
          })
          drawText(formatCurrency(item.valorVendido), colX.total, y, {
            size: 9,
            align: 'right',
          })
          y -= 12
        }
        y -= 10
      }

      // Financials
      checkPageBreak(100)
      const valX = width - margins.right
      drawText('Total Vendido:', margins.left, y, { size: 10 })
      drawText(`R$ ${formatCurrency(totalVendido)}`, valX, y, {
        size: 10,
        align: 'right',
      })
      y -= 15
      if (valorDesconto > 0) {
        drawText('Desconto:', margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(valorDesconto)}`, valX, y, {
          size: 10,
          align: 'right',
          color: rgb(1, 0, 0),
        })
        y -= 15
      }
      drawText('Total a Pagar:', margins.left, y, { size: 10, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, valX, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 15
      drawText('Valor Pago:', margins.left, y, { size: 10 })
      drawText(`R$ ${formatCurrency(valorPago)}`, valX, y, {
        size: 10,
        align: 'right',
      })
      y -= 15
      if (debito > 0) {
        drawText('Restante (Debito):', margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(debito)}`, valX, y, {
          size: 10,
          align: 'right',
          color: rgb(1, 0, 0),
        })
        y -= 15
      }
      y -= 20

      // Payments
      if (payments && payments.length > 0) {
        checkPageBreak(60)
        drawText('FORMAS DE PAGAMENTO', margins.left, y, {
          size: 10,
          font: fontBold,
        })
        y -= 15

        // Headers
        drawText('Metodo', margins.left, y, { size: 9, font: fontBold })
        drawText('Valor', margins.left + 100, y, { size: 9, font: fontBold })
        drawText('Vencimento', margins.left + 200, y, {
          size: 9,
          font: fontBold,
        })

        y -= 12

        for (const p of payments) {
          drawText(p.method, margins.left, y, { size: 9 })
          drawText(
            `R$ ${formatCurrency(p.value)} (${p.installments}x)`,
            margins.left + 100,
            y,
            { size: 9 },
          )
          drawText(safeFormatDate(p.dueDate), margins.left + 200, y, {
            size: 9,
          })
          y -= 12
        }
        y -= 20
      }

      // Signatures
      checkPageBreak(100)
      y -= 40
      const sigLineLength = 200
      page.drawLine({
        start: { x: margins.left, y },
        end: { x: margins.left + sigLineLength, y },
        thickness: 1,
      })
      drawText(
        'Assinatura do Cliente',
        margins.left + sigLineLength / 2,
        y - 15,
        { size: 9, align: 'center' },
      )

      page.drawLine({
        start: { x: width - margins.right - sigLineLength, y },
        end: { x: width - margins.right, y },
        thickness: 1,
      })
      drawText(
        'Assinatura do Vendedor',
        width - margins.right - sigLineLength / 2,
        y - 15,
        { size: 9, align: 'center' },
      )

      if (signature) {
        try {
          const base64Data = signature.split(',')[1]
          const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
            c.charCodeAt(0),
          )
          const image = await pdfDoc.embedPng(imageBytes)
          const imageDims = image.scale(0.4)
          page.drawImage(image, {
            x: margins.left + (sigLineLength - imageDims.width) / 2,
            y: y + 5,
            width: imageDims.width,
            height: imageDims.height,
          })
        } catch (e) {
          console.error(e)
        }
      }

      y -= 50

      // History Section (Enhanced)
      if (history && history.length > 0) {
        checkPageBreak(200)
        drawText(
          'RESUMO DE ACERTOS (HISTORICO - Ultimos 10)',
          margins.left,
          y,
          {
            size: 11,
            font: fontBold,
          },
        )
        y -= 20

        // Revised Columns per User Story: Venda Total, Desconto, Total a Pagar, Vendedor
        const hCol = {
          date: margins.left,
          total: margins.left + 80,
          desc: margins.left + 160,
          pay: margins.left + 240, // Total a Pagar
          seller: margins.left + 320,
        }

        drawText('Data', hCol.date, y, { size: 8, font: fontBold })
        drawText('Venda Total', hCol.total, y, { size: 8, font: fontBold })
        drawText('Desconto', hCol.desc, y, { size: 8, font: fontBold })
        drawText('Total a Pagar', hCol.pay, y, { size: 8, font: fontBold })
        drawText('Vendedor', hCol.seller, y, { size: 8, font: fontBold })

        y -= 5
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: width - margins.right, y },
          thickness: 1,
        })
        y -= 12

        for (const h of history) {
          if (checkPageBreak(20)) y -= 20

          // Calculate values for display
          // h object comes from acertoService.generateDocument -> history array
          // In acertoService, history comes from bancoDeDadosService.getAcertoHistory
          // items have: valorVendaTotal (Venda Total), saldoAPagar (Total a Pagar), vendedor (Name)
          // Desconto is implicit diff or needs to be calculated

          const vendaTotal = h.valorVendaTotal
          const totalAPagar = h.saldoAPagar
          const desconto = vendaTotal - totalAPagar

          drawText(safeFormatDate(h.data), hCol.date, y, { size: 8 })
          drawText(formatCurrency(vendaTotal), hCol.total, y, { size: 8 })
          drawText(formatCurrency(desconto), hCol.desc, y, { size: 8 })
          drawText(formatCurrency(totalAPagar), hCol.pay, y, { size: 8 })
          drawText((h.vendedor || '-').substring(0, 25), hCol.seller, y, {
            size: 8,
          })

          y -= 12
        }
      }
    }

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
