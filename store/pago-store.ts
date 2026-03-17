import { create } from 'zustand';

interface PagoInput {
    monto: number;
    propina: number;
    metodo: string;
    numTerminal?: string;
    tipoTarjeta?: string;
}

interface PagoState {
    pagos: PagoInput[];
    selectedPagoIds: string[]; // Para la pantalla de facturas
    totalADebuer: number;

    // Métodos
    togglePagoSelection: (id: string, singleSelect: boolean) => void;
    setTotalADebuer: (monto: number) => void;
    updatePagos: (nuevosPagos: PagoInput[]) => void;
    getResumen: () => {
        totalIngresado: number;
        faltante: number;
        listoParaLiquidar: boolean;
    };
    resetPagoStore: () => void;
}

export const usePagoStore = create<PagoState>((set, get) => ({
    pagos: [],
    selectedPagoIds: [],
    totalADebuer: 0,

    togglePagoSelection: (id, singleSelect) => {
        const { selectedPagoIds } = get();
        if (singleSelect) {
            set({ selectedPagoIds: [id] });
        } else {
            set({
                selectedPagoIds: selectedPagoIds.includes(id)
                    ? selectedPagoIds.filter(i => i !== id)
                    : [...selectedPagoIds, id]
            });
        }
    },

    setTotalADebuer: (totalADebuer) => set({ totalADebuer }),

    // Al usar set({ pagos }), Zustand notifica a los componentes al instante
    updatePagos: (pagos) => set({ pagos }),

    // store/pago-store.ts
    getResumen: () => {
        const { pagos, totalADebuer } = get();

        const totalIngresado = (pagos || []).reduce((acc, curr) => {
            const monto = Number(curr?.monto) || 0;
            const propina = Number(curr?.propina) || 0;
            return acc + monto + propina;
        }, 0);

        // Calculamos la diferencia real
        const diferencia = Number((totalADebuer - totalIngresado).toFixed(2));

        return {
            totalIngresado,
            faltante: diferencia,
            // Solo permitimos liquidar si la diferencia es CERO absoluto (margen de 0.01 por decimales)
            listoParaLiquidar: Math.abs(diferencia) < 0.01 && totalADebuer > 0
        };
    },

    resetPagoStore: () => set({
        pagos: [],
        totalADebuer: 0,
        selectedPagoIds: []
    }),
}));