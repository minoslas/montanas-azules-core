import { GestorTareas } from "./GestorTareas"
import { PrioridadTarea, IPosicion3D, TipoTarea } from "./Tipos";

export class LogicaMinera {
    /**
     * @description Construye tareas individuales en un cubo 3D volumétrico designado por el jugador.
     * @param {IPosicion3D} inicio - Esquina A.
     * @param {IPosicion3D} fin - Esquina opuesta B.
     * @performance O(W*H*D) instanciación en masa de tareas en el array. Puede penalizar RAM en áreas muy grandes.
     * @contexto Herramienta de interfaz al usuario, transitoria hacia Modelo.
     */
    static designarArea(
        gestor: GestorTareas,
        inicio: IPosicion3D,
        fin: IPosicion3D,
        prioridad: PrioridadTarea = PrioridadTarea.Media
    ): void {
        const xMin = Math.min(inicio.x, fin.x);
        const xMax = Math.max(inicio.x, fin.x);
        const yMin = Math.min(inicio.y, fin.y);
        const yMax = Math.max(inicio.y, fin.y);
        const zMin = Math.min(inicio.z, fin.z);
        const zMax = Math.max(inicio.z, fin.z);

        for(let x = xMin; x <= xMax; x++){
            for(let y = yMin; y <= yMax; y++){
                for(let z = zMin; z <= zMax; z++){
                    gestor.añadirTarea(TipoTarea.PICAR, {x,y,z,}, prioridad);
                }
            }
        }
        console.log(`[MINERÍA] Área designada: ${(xMax-xMin+1) * (yMax-yMin+1) * (zMax-zMin+1)} bloques.`);
    }
}