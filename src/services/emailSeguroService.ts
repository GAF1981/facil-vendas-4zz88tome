import { supabase } from '@/lib/supabase/client'

// Use the new key 'email_relatorio' as per user story
const CONFIG_KEY = 'email_relatorio'

export const emailSeguroService = {
  async getRecipientEmail() {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', CONFIG_KEY)
      .single()

    if (error) {
      // If code is PGRST116 (JSON object requested, multiple (or no) rows returned), return null
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data?.valor
  },

  async updateRecipientEmail(email: string) {
    const { data, error } = await supabase
      .from('configuracoes')
      .upsert(
        {
          chave: CONFIG_KEY,
          valor: email,
        },
        { onConflict: 'chave' },
      )
      .select()

    if (error) throw error
    return data
  },

  async sendReport(userEmail?: string) {
    const { data, error } = await supabase.functions.invoke(
      'send-route-report',
      {
        body: { userEmail },
        method: 'POST',
      },
    )

    // Check for function invocation error (network, 500, 400 etc captured by supabase-js)
    if (error) {
      console.error('Supabase Function Invoke Error:', error)

      let msg = 'Falha ao comunicar com o servidor de envio.'

      // Enhanced error parsing to support 'message' field from backend
      if (typeof error === 'object' && error !== null) {
        // FunctionsHttpError often puts the response body in `context` or parses it if possible
        // But commonly error.message is the stringified JSON body if it failed HTTP check
        try {
          let parsed: any = null
          // Try to parse the message if it looks like JSON
          if ('message' in error) {
            try {
              parsed = JSON.parse(error.message)
            } catch {
              // message is not JSON, use it directly if valid
              parsed = null
            }
          }

          if (parsed) {
            if (parsed.message) {
              msg = parsed.message
            } else if (parsed.error) {
              msg = parsed.error
            }
          } else if ('message' in error) {
            // Fallback to the raw message if it's not JSON
            msg = error.message
          }
        } catch {
          // Fallback if parsing fails totally
          if ('message' in error) msg = error.message
        }
      }

      throw new Error(msg)
    }

    // Check for logical error returned by the function in a 200 OK response (legacy support or if function handles it)
    if (data) {
      if (data.error) throw new Error(data.error)
      // Check for success: false pattern
      if (data.message && data.success === false) throw new Error(data.message)
      // If there is a message and no success indicator, it might be an error if status wasn't 200 (handled above by error)
      // But if status was 200, we assume success unless explicit error field
    }

    return data
  },
}
