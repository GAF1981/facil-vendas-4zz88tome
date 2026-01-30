import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Send Route Report function up and running')

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase Client with Service Role Key for DB access
    // This allows us to access configuracoes, system_logs and ROTA tables bypassing RLS if needed,
    // which is necessary for background tasks or when context is limited.
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
    // Using 'destinatario_email' as per user story
    const { data: configData, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'destinatario_email')
      .single()

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching config:', configError)
      throw new Error('Falha ao buscar configuração de email.')
    }

    // Default to a fallback if not configured, though it should be.
    const recipientEmail = configData?.valor

    if (!recipientEmail) {
      throw new Error(
        'Email de destinatário não configurado (chave: destinatario_email).',
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
      throw new Error('Nenhuma rota encontrada para gerar relatório.')
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
      throw new Error('Erro ao buscar itens da rota.')
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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      throw new Error('Chave de API do Resend não configurada.')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Facil Vendas <onboarding@resend.dev>', // Using a valid/generic sender for reliability
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
      throw new Error(
        `Erro Resend: ${errorData.message || errorData.name || 'Falha desconhecida'}`,
      )
    }

    // 6. Log Success to system_logs
    const logData = {
      user_id: userId, // Can be null if auto triggered or user not found
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

    // Attempt to log failure
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      await supabaseClient.from('system_logs').insert({
        type: 'email_report_error',
        description: `Falha ao enviar relatório: ${errorMessage}`,
        meta: { error: errorMessage, status: 'error' },
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
