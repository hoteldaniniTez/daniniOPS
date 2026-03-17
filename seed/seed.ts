
import bcryptjs from 'bcryptjs';
import { AreaType, MetodoPago, Role, TerminalTipo, TipoTarjeta } from '../lib/generated/prisma/enums';

interface SeedUser {
    name: string;
    email: string;
    password: string;
    role: Role;
}

interface SeedPago {
    metodo: MetodoPago;
    monto: number;
    numTerminal?: TerminalTipo;
    tipoTarjeta?: TipoTarjeta;
    referencia?: string;
}

interface SeedMovimiento {
    referencia: string;
    area: AreaType;
    montoNeto: number;
    propina: number;
    requiereFactura: boolean;
    pagado: boolean;
    nombreCliente?: string;
    detalle?: any;
    pagos: SeedPago[];
}

interface SeedData {
    users: SeedUser[];
    areas: string[];
    movimientosEjemplo: SeedMovimiento[];
}

export const initialData: SeedData = {
    users: [
        {
            name: 'Arturo Riveros',
            email: 'arturo@google.com',
            password: bcryptjs.hashSync('123456', 10),
            role: Role.admin
        },
        {
            name: 'Guadalupe Mundo Melgarejo',
            email: 'luu@google.com',
            password: bcryptjs.hashSync('123456', 10),
            role: Role.recepcionista
        },
        {
            name: 'Miguel Hernández',
            email: 'miguel@google.com',
            password: bcryptjs.hashSync('123456', 10),
            role: Role.auxiliar_admin
        },
    ],

    areas: Object.values(AreaType),

    movimientosEjemplo: [
        {
            referencia: 'REC-9012', area: AreaType.HOTEL, montoNeto: 1800, propina: 0, requiereFactura: true, pagado: true,
            nombreCliente: 'Ing. Roberto Silva', detalle: { habitaciones: '201, 202' },
            pagos: [{ metodo: MetodoPago.tarjeta, monto: 1800, numTerminal: TerminalTipo.T_4303851, tipoTarjeta: TipoTarjeta.DEBITO }]
        },
        {
            referencia: 'REC-2026-X', area: AreaType.HOTEL, montoNeto: 3500, propina: 0, requiereFactura: true, pagado: false,
            nombreCliente: 'Agencia de Viajes México', detalle: { habitaciones: '104, 105' },
            pagos: [{ metodo: MetodoPago.credito_cobrar, monto: 3500 }]
        },
        {
            referencia: 'ANT-H001', area: AreaType.ANTICIPO_HOTEL, montoNeto: 500, propina: 0, requiereFactura: false, pagado: true,
            nombreCliente: 'Familia García', detalle: { habitaciones: '103' },
            pagos: [{ metodo: MetodoPago.efectivo, monto: 500 }]
        },
        {
            referencia: 'CMD-19020', area: AreaType.RESTAURANTE, montoNeto: 1550, propina: 200, requiereFactura: true, pagado: true,
            nombreCliente: 'Cena Ejecutiva', detalle: { comensales: 8, mesa: '2', mesero: 'Geovanny' },
            pagos: [{ metodo: MetodoPago.tarjeta, monto: 1750, numTerminal: TerminalTipo.T_4449999, tipoTarjeta: TipoTarjeta.CREDITO }]
        },
        {
            referencia: 'EVT-601', area: AreaType.EVENTO, montoNeto: 25000, propina: 0, requiereFactura: true, pagado: true,
            nombreCliente: 'Boda Familia Torres', detalle: { areaRentada: 'Jardín Danini', tipoEvento: 'Boda' },
            pagos: [{ metodo: MetodoPago.transferencia, monto: 25000, referencia: 'LIQ-TOTAL' }]
        },
        {
            referencia: 'SOU-1002', area: AreaType.SOUVENIR, montoNeto: 1200, propina: 0, requiereFactura: false, pagado: true,
            nombreCliente: 'Regalo La Perla', detalle: { nombre: 'Pulsera Chapa de Oro' },
            pagos: [{ metodo: MetodoPago.tarjeta, monto: 1200, numTerminal: TerminalTipo.T_4449999, tipoTarjeta: TipoTarjeta.CREDITO }]
        },
        // ... puedes seguir agregando el resto manteniendo este formato de Enums
    ]
};