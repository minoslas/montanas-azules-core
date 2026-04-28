// src/model/entidades/Draconiano.ts
import { IDraconiano, IPosicion3D, TipoRecurso, INecesidades } from "../Tipos";

export class Draconiano {
    readonly id: string;
    public nombre: string;
    public necesidades: INecesidades;
    public estres: number;
    public salud: number = 100; // Añadimos salud para el combate/hambre extrema
    public posicion: IPosicion3D;

    constructor(id: string, nombre: string, x: number, y: number, z: number) {
        this.id = id;
        this.nombre = nombre;
        this.posicion = { x, y, z };
        this.estres = 0;
        this.necesidades = {
            hambre: 0,
            vejiga: 0,
            higiene: 0,
            descanso: 0,
            social: 0
        };
    }

    /**
     * El Controlador llamará a esto en cada tick del juego.
     * @param ratio Multiplicador de tiempo (por si queremos acelerar la simulación)
     */
    public actualizar(ratio: number = 1): void {
        // Metabolismo basado en tu versión
        this.necesidades.hambre += 0.1 * ratio;
        this.necesidades.vejiga += 0.15 * ratio;
        this.necesidades.higiene += 0.05 * ratio;
        this.necesidades.descanso += 0.08 * ratio;

        // Lógica de estrés de tu versión
        if (this.necesidades.vejiga > 80 || this.necesidades.hambre > 80) {
            this.estres += 1 * ratio;
        }

        // Lógica de salud (si el estrés o hambre es crítico, la salud baja)
        if (this.estres > 90 || this.necesidades.hambre > 95) {
            this.salud -= 0.5 * ratio;
        }

        // Limitar valores entre 0 y 100 para evitar desbordamientos
        this.estres = Math.min(100, Math.max(0, this.estres));
        this.salud = Math.min(100, Math.max(0, this.salud));
    }

    public estaVivo(): boolean {
        return this.salud > 0;
    }
}