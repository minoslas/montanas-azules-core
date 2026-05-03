import { GestorTareas } from "./GestorTareas"
import { PrioridadTarea, IPosicion3D, TipoTarea } from "./Tipos";

export class LogicaMinera {
    /**
     * Designamos un area en forma de cubo para ser minada
     * Generaremos una tarea para cada bloque que tenga que ser minado
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