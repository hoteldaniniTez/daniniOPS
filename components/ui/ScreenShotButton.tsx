"use client";

import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image'; // 🟢 Importamos la nueva librería

export const ScreenshotButton = () => {

    const handleScreenshot = async () => {
        const element = document.getElementById('main-content');

        if (!element) {
            toast.error("No se encontró el área de captura");
            return;
        }

        try {
            toast.loading("Generando captura de alta calidad...");

            // 🟢 Usamos toPng de html-to-image
            const dataUrl = await toPng(element, {
                cacheBust: true, // Evita problemas con caché de imágenes
                backgroundColor: "#ffffff", // Fondo blanco para evitar transparencias
                pixelRatio: 2, // Calidad Retina/HD
            });

            // Creamos el enlace de descarga
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Reporte_Danini_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.png`;
            link.click();

            toast.dismiss();
            toast.success("¡Captura descargada con éxito!");

        } catch (error) {
            console.error("Error al capturar:", error);
            toast.dismiss();
            toast.error("Hubo un fallo al generar la imagen");
        }
    };

    return (
        <button
            onClick={handleScreenshot}
            className="fixed bottom-8 right-8 z-99999 flex items-center justify-center h-14 w-14 bg-zinc-900 text-white rounded-full hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.3)] group"
            title="Capturar Pantalla"
        >
            <Camera size={22} className="group-hover:animate-pulse" />
        </button>
    );
};