import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RotaFilterStore {
  selectedEmployeeIds: string[]
  setSelectedEmployeeIds: (ids: string[]) => void
}

export const useRotaFilterStore = create<RotaFilterStore>()(
  persist(
    (set) => ({
      selectedEmployeeIds: [],
      setSelectedEmployeeIds: (ids) => set({ selectedEmployeeIds: ids }),
    }),
    {
      name: 'rota-filters-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
