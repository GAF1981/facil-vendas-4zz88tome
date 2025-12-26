import { supabase } from '@/lib/supabase/client'
import { Employee } from '@/types/employee'

export const authService = {
  /**
   * Verifies employee credentials against the FUNCIONARIOS table using a secure RPC call.
   * Now only checks for email existence.
   */
  async loginByEmail(email: string) {
    // Calling the RPC function that checks email in the FUNCIONARIOS table
    // This bypasses standard Supabase Auth for a custom "App Level" authentication
    const { data, error } = await supabase.rpc('login_by_email', {
      p_email: email.trim(),
    })

    if (error) {
      console.error('Auth RPC Error:', error)
      // Throwing the error object allows the caller to inspect the message/code
      throw new Error(
        error.message ||
          'Erro ao validar credenciais. Tente novamente mais tarde.',
      )
    }

    // Check if any user was returned
    if (data && data.length > 0) {
      return data[0] as unknown as Employee
    }

    return null
  },
}
