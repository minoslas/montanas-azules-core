// src/model/GestorTareas.ts
import { ITarea, EstadoTarea, TipoTarea, PrioridadTarea, IPosicion3D } from "./Tipos";

export class GestorTareas {
    private cola: ITarea[] = [];

    /**
     * El jugador (o un sistema automático) añade una orden de trabajo.
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
     * Busca la tarea más prioritaria que esté libre.
     * En el futuro, aquí podríamos buscar la "más cercana" al draconiano.
     */
    public obtenerTareaDisponible(): ITarea | undefined {
        console.log(`[DEBUG] Consultando tareas pendientes. Total en cola: ${this.cola.length}`);
        return this.cola.find(t => t.estado === EstadoTarea.PENDIENTE);
    }

    /**
     * Un draconiano acepta la responsabilidad de la tarea.
     */
    public asignarTarea(id: string): void {
        const tarea = this.cola.find(t => t.id === id);
        if (tarea) {
            tarea.estado = EstadoTarea.ASIGNADA;
        }
    }

    public finalizarTarea(id: string): void {
        const index = this.cola.findIndex(t => t.id === id);
        if (index !== -1) {
            this.cola[index].estado = EstadoTarea.COMPLETADA;
            // Opcional: Eliminar de la lista para ahorrar RAM tras completarse
            this.cola.splice(index, 1);
        }
    }
}