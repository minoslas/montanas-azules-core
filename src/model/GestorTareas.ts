// src/model/GestorTareas.ts
import { ITarea, EstadoTarea, TipoTarea, PrioridadTarea, IPosicion3D } from "./Tipos";
import { Vec3 } from "../utils/Vector3";

export class GestorTareas {
    private cola: ITarea[] = [];

    /**
     * @description Añade una nueva solicitud al tablón de trabajo.
     * @param {TipoTarea} tipo - Acción requerida.
     * @param {IPosicion3D} posicion - Coordenada de la tarea.
     * @performance O(1) push al final de la cola.
     */
    public añadirTarea(tipo: TipoTarea, posicion: IPosicion3D, prioridad: PrioridadTarea = PrioridadTarea.Media): void {
        const nuevaTarea: ITarea = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            tipo,
            posicion,
            prioridad,
            estado: EstadoTarea.PENDIENTE
        };
        this.cola.push(nuevaTarea);
        console.log(`[Tablón] Nueva tarea: ${tipo} en (${posicion.x}, ${posicion.y}, ${posicion.z})`);
    }

    /**
     * @description Retorna la tarea libre más cercana al solicitante en el backlog.
     * @param {IPosicion3D} posicionSolicitante - Coordenadas actuales del trabajador.
     * @performance O(T) búsqueda lineal donde T = tareas en cola. Optimizada con distancia al cuadrado.
     * @contexto Asignación de trabajo eficiente por proximidad al draconiano (Issue #8).
     */
    public obtenerTareaDisponible(posicionSolicitante: IPosicion3D): ITarea | undefined {
        let tareaMasCercana: ITarea | undefined = undefined;
        let minDistancia = Infinity;

        for (const tarea of this.cola) {
            if (tarea.estado === EstadoTarea.PENDIENTE) {
                // Usamos la versión matemática de CPU ultra-ligera
                const d2 = Vec3.distanciaCuadrada(posicionSolicitante, tarea.posicion);
                
                if (d2 < minDistancia) {
                    minDistancia = d2;
                    tareaMasCercana = tarea;
                }
            }
        }

        if (tareaMasCercana) {
            console.log(`[DEBUG] Tarea más cercana encontrada en X:${tareaMasCercana.posicion.x}. Total en cola: ${this.cola.length}`);
        }
        
        return tareaMasCercana;
    }

    /**
     * @description Marca una orden de trabajo como ocupada para que nadie más la tome.
     * @param {string} id - ID de la tarea.
     * @performance O(T)
     */
    public asignarTarea(id: string): void {
        const tarea = this.cola.find(t => t.id === id);
        if (tarea) {
            tarea.estado = EstadoTarea.ASIGNADA;
        }
    }

    /**
     * @description Cierra exitosamente una labor y libera su espacio en memoria de la cola.
     * @param {string} id - ID a cerrar.
     * @performance O(T) para buscar y O(N) de empuje del Array por el .splice(). Amigable con el GC.
     */
    public finalizarTarea(id: string): void {
        const index = this.cola.findIndex(t => t.id === id);
        if (index !== -1) {
            this.cola[index].estado = EstadoTarea.COMPLETADA;
            this.cola.splice(index, 1);
        }
    }
}