import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

export const backupService = {
  // Fetch record counts for all major tables
  async getStats() {
    const tables = [
      'CLIENTES',
      'BANCO_DE_DADOS',
      'ROTA_ITEMS',
      'PENDENCIAS',
      'FUNCIONARIOS',
    ]
    const stats: Record<string, number> = {}

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error(`Error counting ${table}:`, error)
        stats[table] = 0
      } else {
        stats[table] = count || 0
      }
    }

    return stats
  },

  // Generic fetch all for a table (handling potential pagination if needed, here simplified to high limit)
  async fetchTableData(tableName: string) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(50000) // Reasonable limit for CSV export in this context

    if (error) throw error
    return data || []
  },

  // Convert JSON array to CSV string
  convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return ''

    const header = Object.keys(data[0])
    const csvRows = [header.join(',')]

    for (const row of data) {
      const values = header.map((fieldName) => {
        const val = row[fieldName]
        const escaped = ('' + (val ?? '')).replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  },

  // Trigger browser download
  downloadFile(content: string, fileName: string, type: 'csv' | 'json') {
    const mimeType = type === 'csv' ? 'text/csv' : 'application/json'
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },

  // Export specific table to CSV
  async exportTableToCSV(tableName: string, displayName?: string) {
    const data = await this.fetchTableData(tableName)
    if (data.length === 0) return false

    const csvContent = this.convertToCSV(data)
    const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
    const fileName = `${displayName || tableName}_${timestamp}.csv`

    this.downloadFile(csvContent, fileName, 'csv')
    return true
  },

  // Full Backup JSON
  async generateFullBackup() {
    const tables = [
      'CLIENTES',
      'BANCO_DE_DADOS',
      'ROTA',
      'ROTA_ITEMS',
      'PENDENCIAS',
      'FUNCIONARIOS',
      'PRODUTOS',
      'RECEBIMENTOS',
      'NOTA_FISCAL',
    ]

    const fullBackup: Record<string, any[]> = {}

    for (const table of tables) {
      fullBackup[table] = await this.fetchTableData(table)
    }

    const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
    const fileName = `BACKUP_COMPLETO_FACIL_VENDAS_${timestamp}.json`
    const jsonContent = JSON.stringify(fullBackup, null, 2)

    this.downloadFile(jsonContent, fileName, 'json')
    return true
  },

  // Report Issue
  async reportIssue(
    description: string,
    userId: number,
    type: 'download_failure' | 'bug_report' = 'download_failure',
  ) {
    const { error } = await supabase.from('system_logs').insert({
      description,
      type,
      user_id: userId,
      meta: {
        userAgent: window.navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    } as any)

    if (error) throw error
  },
}
