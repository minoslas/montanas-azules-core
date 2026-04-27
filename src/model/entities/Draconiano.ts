// src/model/entities/Draconiano.ts

export enum PrioridadTarea {
    Baja,
    Media,
    Alta,
    Critica
}

export interface INecesidades {
    hambre: number;       // 0-100
    vejiga: number;      // Necesidad de ir al WC
    higiene: number;     // Necesidad de baño/limpieza de escamas
    descanso: number;    // Fatiga
    social: number;      // Interacción con otros draconianos
}

export class Draconiano {
    readonly id: string;
    public nombre: string;
    public necesidades: INecesidades;
    public estres: number;

    constructor(id: string, nombre: string) {
        this.id = id;
        this.nombre = nombre;
        this.estres = 0;
        this.necesidades = {
            hambre: 0,
            vejiga: 0,
            higiene: 0,
            descanso: 0,
            social: 0
        };
    }

    // El Controlador llamará a esto en cada tick del juego
    public actualizarEstado(ratio: number): void {
        this.necesidades.hambre += 0.1 * ratio;
        this.necesidades.vejiga += 0.15 * ratio;
        this.necesidades.higiene += 0.05 * ratio;
        
        // Lógica de estrés: si las necesidades superan el 80%, el estrés sube
        if (this.necesidades.vejiga > 80) this.estres += 1;
    }
}