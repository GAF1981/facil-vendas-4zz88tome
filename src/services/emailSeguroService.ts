import { supabase } from '@/lib/supabase/client'

export const emailSeguroService = {
  async getRecipientEmail() {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'email_seguro')
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
          chave: 'email_seguro',
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

    // Check for function invocation error (network, 500, etc)
    if (error) {
      console.error('Supabase Function Invoke Error:', error)

      let msg = 'Falha ao comunicar com o servidor de envio.'

      // Try to extract detailed error message from response body if available
      if (typeof error === 'object' && error !== null && 'message' in error) {
        try {
          // Sometimes the message is the JSON string from the backend
          const parsed = JSON.parse(error.message)
          if (parsed && parsed.error) {
            msg = parsed.error
          } else {
            msg = error.message
          }
        } catch {
          msg = error.message
        }
      } else if (typeof error === 'string') {
        try {
          const parsed = JSON.parse(error)
          if (parsed && parsed.error) {
            msg = parsed.error
          } else {
            msg = error
          }
        } catch {
          msg = error
        }
      }

      throw new Error(msg)
    }

    // Check for logical error returned by the function in a 200 OK response (if any)
    if (data && data.error) {
      throw new Error(data.error)
    }

    return data
  },
}
