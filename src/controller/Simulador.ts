// src/controller/Simulador.ts
import { Mapa } from "../model/Mapa";
import { Draconiano } from "../model/entities/Draconiano";

export class Simulador {
    private tickActual: number = 0;
    private mapa: Mapa;
    
    // CORRECCIÓN AQUÍ: Añade los corchetes [] para indicar que es una lista
    private draconiano: Draconiano[] = []; 
    
    private pausado: boolean = false;

    constructor(mapa: Mapa) {
        this.mapa = mapa;
    }

    public añadirDraconiano(d: Draconiano): void {
        this.draconiano.push(d); // .push() funciona porque ahora es un array
    }

    public procesarTick(): void {
        if (this.pausado) return;

        this.tickActual++;
        
        // Ahora .forEach funcionará porque estamos recorriendo la lista de draconianos
        this.draconiano.forEach(krog => {
            if (krog.estaVivo()) {
                // Asegúrate de usar el nombre exacto que pusiste en Draconiano.ts
                // Si lo llamaste actualizarEstado, usa ese.
                krog.actualizar(1); 
            }
        });

        if (this.tickActual % 10 === 0) {
            console.log(`[Simulador] Tick #${this.tickActual}. Población: ${this.draconiano.length}`);
        }
    }

    // ... resto de métodos (togglePausa, etc.)
}