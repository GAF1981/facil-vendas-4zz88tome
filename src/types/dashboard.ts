export interface DashboardMetrics {
  totalSalesToday: number
  totalReceiptsToday: number
  activeRoutes: number
  totalDebt: number
  loading: boolean
}

export interface DashboardStatsState {
  metrics: DashboardMetrics
  error: string | null
}
