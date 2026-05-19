import { IPosicion3D, TipoBloque } from "../model/Tipos";

export class Vec3 {
    /**
     * @description Calcula la distancia Euclidiana pura en el entorno 3D.
     * @param {IPosicion3D} a - Inicio
     * @param {IPosicion3D} b - Fin
     * @performance O(1) cálculos trigonométricos base.
     * @contexto Utilidad matemática base.
     */
    static distancia(a: IPosicion3D, b: IPosicion3D): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * @description Calcula un nuevo punto desplazado hacia el objetivo según la velocidad asignada.
     * @param {IPosicion3D} desde - Origen del desplazamiento.
     * @param {IPosicion3D} hacia - El destino al que tendemos.
     * @param {number} velocidad - Multiplicador de escala.
     * @performance O(1).
     * @contexto Utilidad matemática base para movimientos espaciales.
     */
    static hacia(desde: IPosicion3D, hacia: IPosicion3D, velocidad: number): IPosicion3D {
        const d = this.distancia(desde, hacia);
        if (d < 0.1) return hacia;
        return {
            x: desde.x + ((hacia.x - desde.x) / d) * velocidad,
            y: desde.y + ((hacia.y - desde.y) / d) * velocidad,
            z: desde.z + ((hacia.z - desde.z) / d) * velocidad
        };
    }

    /**
     * @description Modifica el punto origen hacia el objetivo sin crear nuevos objetos en memoria.
     * @param {IPosicion3D} actual - Origen que será mutado (GC Friendly).
     * @param {IPosicion3D} destino - El destino al que tendemos.
     * @param {number} velocidad - Multiplicador de escala.
     * @performance O(1). No activa el Garbage Collector. Regla #2.
     */
    static moverHacia(actual: IPosicion3D, destino: IPosicion3D, velocidad: number): void {
        const d = this.distancia(actual, destino);
        if (d < 0.1) {
            actual.x = destino.x;
            actual.y = destino.y;
            actual.z = destino.z;
            return;
        }
        actual.x += ((destino.x - actual.x) / d) * velocidad;
        actual.y += ((destino.y - actual.y) / d) * velocidad;
        actual.z += ((destino.z - actual.z) / d) * velocidad;
    }

    /**
     * @description Calcula la distancia al cuadrado entre dos puntos, evitando la costosa raíz cuadrada.
     * @param {IPosicion3D} a - Inicio
     * @param {IPosicion3D} b - Fin
     * @performance O(1) operaciones aritméticas básicas. Ultra rápido para comparaciones masivas en bucles.
     * @contexto Optimización de CPU para IA espacial (Issue #8).
     */
    static distanciaCuadrada(a: IPosicion3D, b: IPosicion3D): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return (dx * dx) + (dy * dy) + (dz * dz);
    }
}