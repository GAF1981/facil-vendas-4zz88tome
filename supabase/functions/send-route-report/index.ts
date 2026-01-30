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
          message: 'Configuração do servidor incompleta (API Key ausente)',
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

    if (configError && configError.code !== 'PGRST116') {
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

    // 2. Fetch Route Data (Latest Route)
    const { data: routeData } = await supabaseClient
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const routeId = routeData?.id

    if (!routeId) {
      return new Response(
        JSON.stringify({
          message: 'Nenhuma rota encontrada para gerar relatório.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Fetch Route Items
    const { data: items, error: itemsError } = await supabaseClient
      .from('ROTA_ITEMS')
      .select(
        `
        rota_id,
        tarefas,
        agregado,
        boleto,
        vendedor_id,
        ROTA ( data_inicio ),
        CLIENTES ( "NOME CLIENTE" ),
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .eq('rota_id', routeId)

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return new Response(
        JSON.stringify({
          message: 'Erro ao buscar itens da rota no banco de dados.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 4. Generate CSV
    const csvHeader = [
      'ID Rota',
      'Data Início',
      'Cliente',
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
        item.rota_id,
        dataInicio,
        `"${cliente}"`,
        `"${vendedor}"`,
        `"${tarefas}"`,
        agregado,
        boleto,
      ].join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // 5. Send Email via Resend
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
          subject: `Relatório Controle de Rota #${routeId}`,
          html: `
              <div style="font-family: sans-serif; color: #333;">
                <h2>Relatório de Rota #${routeId}</h2>
                <p>Olá,</p>
                <p>O relatório de controle de rota foi gerado com sucesso.</p>
                <p><strong>Resumo:</strong></p>
                <ul>
                  <li><strong>ID da Rota:</strong> ${routeId}</li>
                  <li><strong>Total de Itens:</strong> ${items.length}</li>
                  <li><strong>Destinatário:</strong> ${recipientEmail}</li>
                  <li><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                </ul>
                <p>O arquivo CSV está anexado a este e-mail.</p>
                <br/>
                <p>Atenciosamente,<br/>Equipe Facil Vendas</p>
              </div>
            `,
          attachments: [
            {
              filename: `controle_rota_${routeId}.csv`,
              content: btoa(unescape(encodeURIComponent(csvContent))), // Base64 encode
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Resend Error:', errorData)

        let resendMessage = 'Erro ao enviar e-mail via Resend.'
        // Enhanced error handling as per user story
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
            status: res.status, // Return original status (e.g. 403, 429)
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

    // 6. Log Success to system_logs
    const logData = {
      user_id: userId,
      type: 'email_report',
      description: `Relatório da rota #${routeId} enviado com sucesso para ${recipientEmail}`,
      meta: {
        recipientEmail,
        routeId,
        itemCount: items.length,
        status: 'success',
      },
    }

    await supabaseClient.from('system_logs').insert(logData)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatório enviado com sucesso para ${recipientEmail}`,
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
