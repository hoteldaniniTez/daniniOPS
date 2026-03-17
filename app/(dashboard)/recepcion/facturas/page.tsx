import { redirect } from 'next/navigation';

export default function FacturasIndexPage() {
    // Redirigimos automáticamente a la vista de Asignar
    redirect('/recepcion/facturas/asignar');
}