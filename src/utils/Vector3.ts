import { IPosicion3D } from "../model/Tipos";

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
     * @description Modifica el punto origen hacia el objetivo usando Lógica Voxel pura.
     * @param {IPosicion3D} actual - Origen que será mutado.
     * @param {IPosicion3D} destino - El destino al que tendemos.
     * @param {number} velocidad - Multiplicador de escala.
     */
    static moverHacia(actual: IPosicion3D, destino: IPosicion3D, velocidad: number): void {
        const d = this.distancia(actual, destino);
        
        const dx = destino.x - actual.x;
        const dy = destino.y - actual.y;
        const dz = destino.z - actual.z;

        // --- MOVIMIENTO ORTOGONAL ESTRICTO ---
        // Obligamos a resolver el movimiento alineado a los ejes para nunca cortar por las diagonales 
        // Esto asegura que el material sólido sea impenetrable y no colisionen al bordear esquinas.
        if (Math.abs(dy) > 0.01) {
            actual.y += Math.sign(dy) * Math.min(velocidad, Math.abs(dy));
        } else if (Math.abs(dx) > Math.abs(dz)) {
            actual.x += Math.sign(dx) * Math.min(velocidad, Math.abs(dx));
        } else if (Math.abs(dz) > 0.01) {
            actual.z += Math.sign(dz) * Math.min(velocidad, Math.abs(dz));
        } else {
            actual.x = destino.x;
            actual.y = destino.y;
            actual.z = destino.z;
        }
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