import { AreaType, MetodoPago, TerminalTipo, TipoFactura, TipoTarjeta } from "@/lib/generated/prisma/enums";

// 1. Relación de Factura (Basado en tu modelo Factura)
export interface FacturaRelacion {
    id: string;
    createdAt: Date;
    folio: string;
    tipo: TipoFactura;
    area: AreaType;
    subtotal: number;
    iva: number;
    ish: number;
    total: number;
    usuarioId: string;
}

// 2. Estructura del Pago (Basado en tu modelo Pago)
export interface PagoCompleto {
    id: string;
    movimientoId: string;
    fechaPago: Date;
    monto: number;
    metodo: MetodoPago;
    propina: number;
    requiereFactura: boolean;
    facturado: boolean;
    nombreFactura: string;
    numTerminal: TerminalTipo | null;
    tipoTarjeta: string | null;
    referencia: string | null; facturaId: string | null;

    // Relación opcional con Factura
    factura?: FacturaRelacion | null;

    // Para evitar errores en la tabla si usas estos nombres:
    folioFactura?: string | null;
    fechaFacturacion?: Date | null;
    cajeroId: string;
}

// 3. Detalles de cada área (1:1)
export interface DetalleHotel {
    id: string;
    movimientoId: string;
    habitaciones: string;
}

export interface DetalleRestaurante {
    id: string;
    movimientoId: string;
    comensales: number;
    mesa: string;
    mesero: string;
}

export interface DetalleEvento {
    id: string;
    movimientoId: string;
    areaRentada: string;
    tipoEvento: string;
}

export interface DetalleSouvenir {
    id: string;
    movimientoId: string;
    nombre: string;
}

// 4. Interfaz Final: MovimientoCompleto
export interface MovimientoCompleto {
    id: string;
    createdAt: Date;
    area: AreaType;
    descripcion?: string | null;
    referencia: string;
    montoNeto: number;
    pagado: boolean;
    nombreCliente: string | null;
    usuarioId: string;
    creador?: string | null;


    // Relaciones de Detalle
    pagos: PagoCompleto[];
    detalleHotel?: DetalleHotel | null;
    detalleRestaurante?: DetalleRestaurante | null;
    detalleEvento?: DetalleEvento | null;
    detalleSouvenir?: DetalleSouvenir | null;
}

// En MovimientoCompleto, asegúrate de que los detalles acepten null explícitamente
export interface MovimientoFactura {
    id: string;
    createdAt: Date;
    area: AreaType;
    descripcion: string | null;
    referencia: string;
    montoNeto: number;
    pagado: boolean;
    nombreCliente: string | null;
    usuarioId: string;

    // Relaciones obligatorias en el include de Prisma
    detalleHotel: DetalleHotel | null;
    detalleRestaurante: DetalleRestaurante | null;
    detalleEvento: DetalleEvento | null;
    detalleSouvenir: DetalleSouvenir | null;
    pagos?: any[]; // Opcional por si Prisma lo incluye en el query
}

export interface FacturaDetalleVinculacion {
    id: string;
    facturaId: string;
    pagoId: string;
    monto: number; // Ya convertido a number por tu Action
    factura?: FacturaRelacion | null; // Relación anidada
}

// 4. Interfaz Principal: PagoFactura
// Esta es la que usas en el useState de tu Frontend
export interface PagoFactura {
    id: string;
    movimientoId: string;
    fechaPago: Date;
    monto: number;
    metodo: MetodoPago;
    propina: number;
    requiereFactura: boolean;
    facturado: boolean;
    nombreFactura: string | null;
    numTerminal: TerminalTipo | null;
    tipoTarjeta: string | null;
    referencia: string | null;
    facturaId: string | null;
    cajeroId: string;

    // Relaciones anidadas
    facturasVinculadas: FacturaDetalleVinculacion[];

    factura: FacturaRelacion | null;
    movimiento: MovimientoFactura;
}

export interface FacturaRelacion {
    id: string;
    createdAt: Date;
    folio: string;
    tipo: TipoFactura;
    area: AreaType;
    subtotal: number;
    iva: number;
    ish: number;
    total: number;
    usuarioId: string;
}

export const METODOS_PAGO_OPCIONES = [
    { id: MetodoPago.efectivo, label: 'Efectivo' },
    { id: MetodoPago.transferencia, label: 'Transferencia' },
    { id: MetodoPago.tarjeta, label: 'Tarjeta (Terminal)' },
    { id: MetodoPago.p_deposito, label: 'P/Deposito' },
    { id: MetodoPago.credito_familiar, label: 'Crédito Familiar' },
    { id: MetodoPago.credito_cobrar, label: 'Crédito por Cobrar' },
    { id: MetodoPago.cupon, label: 'Cupón Restaurante' },
    { id: MetodoPago.cortesia_r, label: 'Cortesía Restaurante' },
    { id: MetodoPago.cortesia_h, label: 'Cortesía Hotel' },
];

export const TERMINALES = [
    { id: TerminalTipo.T_4303851, label: "4303851" },
    { id: TerminalTipo.T_4449999, label: "4449999" }
];

export const TIPOTARJETA = [
    { id: TipoTarjeta.DEBITO, label: "DEBITO" },
    { id: TipoTarjeta.CREDITO, label: "CREDITO" },
    { id: TipoTarjeta.INTERNACIONAL, label: "INTERNACIONAL" },
    { id: TipoTarjeta.AMEX, label: "AMEX" },
];

export const AREAT = [
    { id: AreaType.HOTEL, label: "HOTEL" },
    { id: AreaType.ANTICIPO_HOTEL, label: "ANTICIPO HOTEL" },
    { id: AreaType.RESTAURANTE, label: "RESTAURANTE" },
    { id: AreaType.ANTICIPO_RESTAURANTE, label: "ANTICIPO RESTAURANTE" },
    { id: AreaType.EVENTO, label: "EVENTO" },
    { id: AreaType.RENTA_ESPACIOS, label: "RENTA ESPACIOS" },
    { id: AreaType.SOUVENIR, label: "SOUVENIR" },
];

export const MESEROS = ["Victor", "Gregorio", "Geovanny", "Por Asignar"];
export const AreasEvento = ["Jardín de la fuente", "Arcos con jardín", "Terraza el mural", "Jardín Danini", "Restaurante", "Otro"];
export const TipoEvento = ["XV Años", "Boda", "Bautizo", "Primera Comunión", "Graduación", "Reunión Corporativa", "Posada", "Desayuno", "Comida", "Cena", "Otro"];

export const METODOS_CON_FACTURA: MetodoPago[] = [
    MetodoPago.tarjeta,
    MetodoPago.transferencia,
    MetodoPago.p_deposito
];

export type TipoTurno = 'dia' | 'tarde' | 'noche';