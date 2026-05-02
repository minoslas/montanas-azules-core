// src/controller/Simulador.ts
import { Mapa } from "../model/Mapa";
import { Draconiano } from "../model/entities/Draconiano";
import { GestorTareas } from "../model/GestorTareas";
import { IContextoSimulacion } from "../model/Tipos";

export class Simulador {
    private tickActual: number = 0;
    private mapa: Mapa;
    private gestorTareas: GestorTareas;

    // CORRECCIÓN AQUÍ: Añade los corchetes [] para indicar que es una lista
    private entidades: Draconiano[] = [];
    private pausado: boolean = false;

    constructor(mapa: Mapa) {
        this.mapa = mapa;
        this.gestorTareas = new GestorTareas();
    }

    public añadirDraconiano(d: Draconiano): void {
        this.entidades.push(d); // .push() funciona porque ahora es un array
    }

    public procesarTick(): void {
        if (this.pausado) return;
        this.tickActual++;

        // Creamos un contexto una sola vez por tick
        const constexto : IContextoSimulacion = {
            ratio: 1,
            gestor: this.gestorTareas,
            mapa: this.mapa,
            tickActual: this.tickActual
        }

        // Ahora .forEach funcionará porque estamos recorriendo la lista de draconianos
        this.entidades.forEach(e => {
            if (e.estaVivo()) {
                // Asegúrate de usar el nombre exacto que pusiste en Draconiano.ts
                // Si lo llamaste actualizarEstado, usa ese.
                e.actualizar(constexto);
            }
        });

        if (this.tickActual % 10 === 0) {
            console.log(`[Simulador] Tick #${this.tickActual}. Población: ${this.entidades.length}`);
        }
    }

    public getGestor(): GestorTareas {
        return this.gestorTareas;
    }


    // ... resto de métodos (togglePausa, etc.)
}