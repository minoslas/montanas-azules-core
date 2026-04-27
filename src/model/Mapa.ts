// src/model/Mapa.ts
import { IPosicion3D, TipoRecurso } from "./Tipos";

export enum TipoBloque {
    AIRE = 0,
    PIEDRA = 1,
    TIERRA = 2,
    GEMA = 3,
    VETA_MINERAL = 4
}

export class Mapa {
    // El "corazón" de la montaña: solo guardamos lo que NO es piedra sólida
    private celdas: Map<string, TipoBloque>;

    constructor() {
        this.celdas = new Map<string, TipoBloque>();
    }

    /**
     * Genera una clave única para el mapa a partir de coordenadas
     * Ejemplo: (10, 5, -2) -> "10,5,-2"
     */
    private generarClave(x: number, y: number, z: number): string {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    /**
     * Obtiene el bloque en una posición. 
     * Si no está en el mapa, asumimos que es PIEDRA (ahorro de RAM).
     */
    public getBloque(x: number, y: number, z: number): TipoBloque {
        const clave = this.generarClave(x, y, z);
        return this.celdas.get(clave) ?? TipoBloque.PIEDRA;
    }

    /**
     * Cambia el tipo de bloque en una posición.
     */
    public setBloque(x: number, y: number, z: number, tipo: TipoBloque): void {
        const clave = this.generarClave(x, y, z);
        
        // Optimización: Si volvemos a poner piedra, lo borramos del mapa 
        // para liberar memoria, ya que PIEDRA es el valor por defecto.
        if (tipo === TipoBloque.PIEDRA) {
            this.celdas.delete(clave);
        } else {
            this.celdas.set(clave, tipo);
        }
    }

    /**
     * Devuelve cuántos bloques "especiales" tenemos cargados en RAM.
     */
    public obtenerCargaMemoria(): number {
        return this.celdas.size;
    }
}