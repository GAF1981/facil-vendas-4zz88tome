import { supabase } from '@/lib/supabase/client'
import { Pendencia, PendenciaInsert, PendenciaUpdate } from '@/types/pendencia'

export const pendenciasService = {
  async getAll(resolvida?: boolean) {
    let query = supabase
      .from('PENDENCIAS')
      .select(
        `
        *,
        CLIENTES (
          CODIGO,
          "NOME CLIENTE",
          "TIPO DE CLIENTE"
        ),
        FUNCIONARIOS (
          id,
          nome_completo
        )
      `,
      )
      .order('created_at', { ascending: false })

    if (resolvida !== undefined) {
      query = query.eq('resolvida', resolvida)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Pendencia[]
  },

  async create(pendencia: PendenciaInsert) {
    const { data, error } = await supabase
      .from('PENDENCIAS')
      .insert(pendencia)
      .select()
      .single()

    if (error) throw error
    return data as Pendencia
  },

  async update(id: number, pendencia: PendenciaUpdate) {
    const { data, error } = await supabase
      .from('PENDENCIAS')
      .update(pendencia)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Pendencia
  },

  async resolve(id: number, descricao_resolucao: string) {
    const { data, error } = await supabase
      .from('PENDENCIAS')
      .update({
        resolvida: true,
        descricao_resolucao,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Pendencia
  },

  async delete(id: number) {
    const { error } = await supabase.from('PENDENCIAS').delete().eq('id', id)
    if (error) throw error
  },
}
