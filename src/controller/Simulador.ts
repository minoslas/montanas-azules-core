// src/controller/Simulador.ts
import { Mapa } from "../model/Mapa";

export class Simulador {
    private tickActual: number = 0;
    private mapa: Mapa;
    private pausado: boolean = false;

    constructor(mapa: Mapa) {
        this.mapa = mapa;
    }

    /**
     * Avanza la simulación un paso.
     * En el futuro, aquí se gestionará el hambre y el movimiento de los draconianos.
     */
    public procesarTick(): void {
        if (this.pausado) return;

        this.tickActual++;
        
        // Notificación de progreso cada 10 ticks para no saturar la consola
        if (this.tickActual % 10 === 0) {
            console.log(`[Simulador] Tick #${this.tickActual} completado.`);
        }
    }

    public togglePausa(): void {
        this.pausado = !this.pausado;
        console.log(this.pausado ? "⏸️ Simulación PAUSADA" : "▶️ Simulación REANUDADA");
    }

    public getTickActual(): number {
        return this.tickActual;
    }
}