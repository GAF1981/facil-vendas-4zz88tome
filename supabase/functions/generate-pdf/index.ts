import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { client, employee, items, date, acertoTipo, total } =
      await req.json()

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    let y = height - 50

    const drawText = (
      text: string,
      x: number,
      size: number = 12,
      align: 'left' | 'right' = 'left',
    ) => {
      const cleanText = removeAccents(text)
      const textWidth = font.widthOfTextAtSize(cleanText, size)
      const xPos = align === 'right' ? x - textWidth : x
      page.drawText(cleanText, { x: xPos, y, size, font })
    }

    // Title
    drawText('FACIL VENDAS - Comprovante de Pedido', 50, 18)
    y -= 25

    // Header Info
    const dateStr = new Date(date).toLocaleString('pt-BR')
    drawText(`Data: ${dateStr}`, 50, 10)
    drawText(`Tipo: ${acertoTipo}`, 300, 10)
    y -= 15

    drawText(
      `Cliente: ${client['NOME CLIENTE']} (Cod: ${client.CODIGO})`,
      50,
      10,
    )
    y -= 15
    drawText(`Funcionario: ${employee.nome_completo}`, 50, 10)
    y -= 30

    // Table Header
    drawText('Produto', 50, 10)
    drawText('Qtd', 350, 10, 'right')
    drawText('Unit', 450, 10, 'right')
    drawText('Total', 550, 10, 'right')
    y -= 5

    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 550, y: y },
      thickness: 1,
    })
    y -= 15

    // Items
    for (const item of items) {
      if (y < 50) {
        page = pdfDoc.addPage()
        y = height - 50
      }

      const name = (item.produtoNome || '').substring(0, 45)
      drawText(name, 50, 10)
      drawText(String(item.quantVendida), 350, 10, 'right')
      drawText(
        item.precoUnitario.toFixed(2).replace('.', ','),
        450,
        10,
        'right',
      )
      drawText(item.valorVendido.toFixed(2).replace('.', ','), 550, 10, 'right')
      y -= 15
    }

    // Footer Line
    y += 5
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 550, y: y },
      thickness: 1,
    })
    y -= 20

    // Total
    drawText(
      `VALOR TOTAL: R$ ${total.toFixed(2).replace('.', ',')}`,
      550,
      14,
      'right',
    )

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
