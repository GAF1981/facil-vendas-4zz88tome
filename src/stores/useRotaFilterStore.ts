import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RotaFilterStore {
  selectedEmployeeIds: string[]
  hasSetDefaultSeller: boolean
  setSelectedEmployeeIds: (ids: string[]) => void
  setHasSetDefaultSeller: (val: boolean) => void
}

export const useRotaFilterStore = create<RotaFilterStore>()(
  persist(
    (set) => ({
      selectedEmployeeIds: [],
      hasSetDefaultSeller: false,
      setSelectedEmployeeIds: (ids) => set({ selectedEmployeeIds: ids }),
      setHasSetDefaultSeller: (val) => set({ hasSetDefaultSeller: val }),
    }),
    {
      name: 'rota-filters-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
