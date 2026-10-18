import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Trạng thái giao diện: sidebar (drawer mobile), bé đang chọn (PH nhiều con)
export const useUiStore = create(
  persist(
    (set) => ({
      sidebarOpen: false,
      selectedChildId: null,
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSelectedChild: (id) => set({ selectedChildId: id }),
    }),
    { name: 'kc-ui', partialize: (s) => ({ selectedChildId: s.selectedChildId }) },
  ),
);
