import { create } from 'zustand';
import { MovimientoCompleto } from '@/interfaces';

interface UIState {
    isDetailOpen: boolean;
    selectedMovement: MovimientoCompleto | null;

    // Acciones
    openDetail: (movement: MovimientoCompleto) => void;
    closeDetail: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isDetailOpen: false,
    selectedMovement: null,

    openDetail: (movement) => set({ isDetailOpen: true, selectedMovement: movement }),
    closeDetail: () => set({ isDetailOpen: false, selectedMovement: null }),
}));