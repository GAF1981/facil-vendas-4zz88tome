import { supabase } from '@/lib/supabase/client'

export const emailSeguroService = {
  async getRecipientEmail() {
    const { data, error } = await supabase
      .from('configuracoes' as any)
      .select('valor')
      .eq('chave', 'email_relatorio_rota')
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
      .from('configuracoes' as any)
      .upsert(
        {
          chave: 'email_relatorio_rota',
          valor: email,
        },
        { onConflict: 'chave' },
      )
      .select()

    if (error) throw error
    return data
  },

  async sendReport() {
    const { data, error } = await supabase.functions.invoke(
      'send-route-report',
      {
        method: 'POST',
      },
    )
    if (error) throw error
    return data
  },
}
