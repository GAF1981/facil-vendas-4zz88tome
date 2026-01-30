import { supabase } from '@/lib/supabase/client'

export const emailSeguroService = {
  async getRecipientEmail() {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'destinatario_email')
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
          chave: 'destinatario_email',
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
      throw new Error(error.message || 'Erro ao comunicar com o servidor.')
    }

    // Check for logical error returned by the function
    if (data && data.error) {
      throw new Error(data.error)
    }

    return data
  },
}
