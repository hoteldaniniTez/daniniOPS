// src/store/useAuthStore.ts
import { create } from 'zustand';

interface AuthState {
    isLandingViewed: boolean;
    setLandingViewed: (viewed: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isLandingViewed: false,
    setLandingViewed: (viewed) => set({ isLandingViewed: viewed }),
}));