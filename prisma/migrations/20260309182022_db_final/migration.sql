-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'recepcionista', 'auxiliar_admin');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('HOTEL', 'ANTICIPO_HOTEL', 'RESTAURANTE', 'ANTICIPO_RESTAURANTE', 'EVENTO', 'RENTA_ESPACIOS', 'SOUVENIR');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'p_deposito', 'credito_familiar', 'credito_cobrar', 'cortesia_r', 'cortesia_h', 'cupon');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN');

-- CreateEnum
CREATE TYPE "TipoFactura" AS ENUM ('GLOBAL', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "TerminalTipo" AS ENUM ('T_4303851', 'T_4449999');

-- CreateEnum
CREATE TYPE "TipoTarjeta" AS ENUM ('DEBITO', 'CREDITO', 'AMEX', 'INTERNACIONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'recepcionista',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "area" "AreaType" NOT NULL,
    "referencia" TEXT NOT NULL,
    "montoNeto" DECIMAL(10,2) NOT NULL,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "nombreCliente" TEXT,
    "descripcion" TEXT,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "folio" TEXT NOT NULL,
    "tipo" "TipoFactura" NOT NULL,
    "area" "AreaType" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "iva" DECIMAL(10,2) NOT NULL,
    "ish" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "fechaPago" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "numTerminal" "TerminalTipo",
    "tipoTarjeta" "TipoTarjeta",
    "propina" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "requiereFactura" BOOLEAN NOT NULL DEFAULT false,
    "facturado" BOOLEAN NOT NULL DEFAULT false,
    "nombreFactura" TEXT,
    "referencia" TEXT,
    "movimientoId" TEXT NOT NULL,
    "cajeroId" TEXT NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaDetallePago" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FacturaDetallePago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleHotel" (
    "id" TEXT NOT NULL,
    "habitaciones" TEXT NOT NULL,
    "movimientoId" TEXT NOT NULL,

    CONSTRAINT "DetalleHotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleRestaurante" (
    "id" TEXT NOT NULL,
    "comensales" INTEGER NOT NULL,
    "mesa" TEXT NOT NULL,
    "mesero" TEXT NOT NULL,
    "movimientoId" TEXT NOT NULL,

    CONSTRAINT "DetalleRestaurante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleEvento" (
    "id" TEXT NOT NULL,
    "areaRentada" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "movimientoId" TEXT NOT NULL,

    CONSTRAINT "DetalleEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleSouvenir" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "movimientoId" TEXT NOT NULL,

    CONSTRAINT "DetalleSouvenir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "accion" "AuditAction" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "motivo" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Movimiento_referencia_key" ON "Movimiento"("referencia");

-- CreateIndex
CREATE INDEX "Movimiento_createdAt_idx" ON "Movimiento"("createdAt");

-- CreateIndex
CREATE INDEX "Movimiento_area_idx" ON "Movimiento"("area");

-- CreateIndex
CREATE INDEX "Movimiento_pagado_idx" ON "Movimiento"("pagado");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_folio_key" ON "Factura"("folio");

-- CreateIndex
CREATE INDEX "Factura_createdAt_idx" ON "Factura"("createdAt");

-- CreateIndex
CREATE INDEX "Factura_area_idx" ON "Factura"("area");

-- CreateIndex
CREATE INDEX "Pago_cajeroId_idx" ON "Pago"("cajeroId");

-- CreateIndex
CREATE INDEX "Pago_fechaPago_idx" ON "Pago"("fechaPago");

-- CreateIndex
CREATE INDEX "Pago_metodo_idx" ON "Pago"("metodo");

-- CreateIndex
CREATE INDEX "Pago_requiereFactura_facturado_idx" ON "Pago"("requiereFactura", "facturado");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaDetallePago_facturaId_pagoId_key" ON "FacturaDetallePago"("facturaId", "pagoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleHotel_movimientoId_key" ON "DetalleHotel"("movimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleRestaurante_movimientoId_key" ON "DetalleRestaurante"("movimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleEvento_movimientoId_key" ON "DetalleEvento"("movimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleSouvenir_movimientoId_key" ON "DetalleSouvenir"("movimientoId");

-- CreateIndex
CREATE INDEX "AuditLog_entityName_entityId_idx" ON "AuditLog"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_cajeroId_fkey" FOREIGN KEY ("cajeroId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaDetallePago" ADD CONSTRAINT "FacturaDetallePago_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaDetallePago" ADD CONSTRAINT "FacturaDetallePago_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleHotel" ADD CONSTRAINT "DetalleHotel_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRestaurante" ADD CONSTRAINT "DetalleRestaurante_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleEvento" ADD CONSTRAINT "DetalleEvento_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleSouvenir" ADD CONSTRAINT "DetalleSouvenir_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
