import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Send Route Report function up and running')

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 0. Validate Environment Variables (API Key check as per AC)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          message:
            'Configuração do servidor incompleta (Missing RESEND_API_KEY)',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Initialize Supabase Client with Service Role Key for DB access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get Request Body (expecting userEmail for logging)
    let body = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (e) {
      console.warn('Failed to parse body:', e)
    }
    const { userEmail } = body as { userEmail?: string }

    let userId: number | null = null

    // Resolve user ID from email if provided (for logging)
    if (userEmail) {
      const { data: userData } = await supabaseClient
        .from('FUNCIONARIOS')
        .select('id')
        .eq('email', userEmail)
        .single()

      if (userData) {
        userId = userData.id
      }
    }

    // 1. Fetch recipient email configuration
    // Using 'email_relatorio' as per user story requirements
    const { data: configData, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'email_relatorio')
      .single()

    if (configError) {
      console.error('Error fetching config:', configError)
      return new Response(
        JSON.stringify({
          message: 'Erro ao buscar configuração de e-mail no banco de dados.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const recipientEmail = configData?.valor

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          message: 'E-mail do destinatário não configurado',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Fetch Full History of Route Items (Unfiltered)
    // As per user story: Fetch all records, joined with ROTA, CLIENTES, FUNCIONARIOS
    const { data: items, error: itemsError } = await supabaseClient
      .from('ROTA_ITEMS')
      .select(
        `
        id,
        rota_id,
        tarefas,
        agregado,
        boleto,
        vendedor_id,
        cliente_id,
        x_na_rota,
        ROTA ( data_inicio ),
        CLIENTES ( "NOME CLIENTE" ),
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .order('rota_id', { ascending: false })
      .order('x_na_rota', { ascending: true })
      .limit(10000) // Safety limit for performance, though requirement implies "all"

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return new Response(
        JSON.stringify({
          message: 'Erro ao buscar histórico completo de rotas.',
          details: itemsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'Nenhum registro encontrado no histórico de rotas.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Generate CSV
    const csvHeader = [
      'ID Item',
      'ID Rota',
      'Data Rota',
      'Ordem (X)',
      'ID Cliente',
      'Cliente',
      'ID Vendedor',
      'Vendedor',
      'Tarefas',
      'Agregado',
      'Boleto',
    ].join(',')

    const csvRows = items.map((item: any) => {
      const dataInicio = item.ROTA?.data_inicio
        ? new Date(item.ROTA.data_inicio).toLocaleDateString('pt-BR')
        : ''
      const cliente = (item.CLIENTES?.['NOME CLIENTE'] || '').replace(
        /"/g,
        '""',
      )
      const vendedor = (item.FUNCIONARIOS?.nome_completo || '').replace(
        /"/g,
        '""',
      )
      const tarefas = (item.tarefas || '').replace(/"/g, '""')
      const agregado = item.agregado ? 'SIM' : 'NÃO'
      const boleto = item.boleto ? 'SIM' : 'NÃO'

      return [
        item.id,
        item.rota_id,
        dataInicio,
        item.x_na_rota ?? '',
        item.cliente_id,
        `"${cliente}"`,
        item.vendedor_id,
        `"${vendedor}"`,
        `"${tarefas}"`,
        agregado,
        boleto,
      ].join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // 4. Send Email via Resend
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Facil Vendas <onboarding@resend.dev>',
          to: [recipientEmail],
          subject: `Relatório Completo de Rotas (Histórico)`,
          html: `
              <div style="font-family: sans-serif; color: #333;">
                <h2>Relatório Completo de Rotas</h2>
                <p>Olá,</p>
                <p>O relatório consolidado com todo o histórico de itens de rota foi gerado com sucesso.</p>
                <p><strong>Resumo:</strong></p>
                <ul>
                  <li><strong>Total de Registros:</strong> ${items.length}</li>
                  <li><strong>Destinatário:</strong> ${recipientEmail}</li>
                  <li><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                </ul>
                <p>O arquivo CSV contendo o histórico completo está anexado a este e-mail.</p>
                <br/>
                <p>Atenciosamente,<br/>Equipe Facil Vendas</p>
              </div>
            `,
          attachments: [
            {
              filename: `historico_rotas_completo_${new Date().toISOString().split('T')[0]}.csv`,
              content: btoa(unescape(encodeURIComponent(csvContent))), // Base64 encode
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Resend Error:', errorData)

        let resendMessage = 'Erro ao enviar e-mail via Resend.'
        // Enhanced error handling
        if (errorData) {
          if (errorData.message) {
            resendMessage = `Erro Resend: ${errorData.message}`
          } else if (errorData.name) {
            resendMessage = `Erro Resend: ${errorData.name}`
          }
        }

        return new Response(
          JSON.stringify({ message: resendMessage, details: errorData }),
          {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    } catch (resendError: any) {
      console.error('Resend Exception:', resendError)
      return new Response(
        JSON.stringify({
          message: `Falha na conexão com Resend: ${resendError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 5. Log Success to system_logs
    const logData = {
      user_id: userId,
      type: 'email_report',
      description: `Relatório COMPLETO de rotas enviado com sucesso para ${recipientEmail}`,
      meta: {
        recipientEmail,
        itemCount: items.length,
        status: 'success',
        type: 'full_history',
      },
    }

    await supabaseClient.from('system_logs').insert(logData)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatório completo enviado com sucesso para ${recipientEmail}`,
        count: items.length,
        sentTo: recipientEmail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Function Error:', errorMessage)

    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
