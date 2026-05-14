// src/model/GestorTareas.ts
import {
  ITarea,
  EstadoTarea,
  TipoTarea,
  PrioridadTarea,
  IPosicion3D,
} from "./Tipos";
import { Vec3 } from "../utils/Vector3";

export class GestorTareas {
  private cola: ITarea[] = [];

  /**
   * @description Añade una nueva solicitud al tablón de trabajo.
   * @param {TipoTarea} tipo - Acción requerida.
   * @param {IPosicion3D} posicion - Coordenada de la tarea.
   * @performance O(1) push al final de la cola.
   */
  public añadirTarea(
    tipo: TipoTarea,
    posicion: IPosicion3D,
    prioridad: PrioridadTarea = PrioridadTarea.Media,
  ): void {
    const nuevaTarea: ITarea = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tipo,
      posicion,
      prioridad,
      estado: EstadoTarea.PENDIENTE,
    };
    this.cola.push(nuevaTarea);
    console.log(
      `[Tablón] Nueva tarea: ${tipo} en (${posicion.x}, ${posicion.y}, ${posicion.z})`,
    );
  }

    /**
     * @description Retorna la tarea libre más cercana al solicitante, respetando el orden de prioridad.
     * @param {IPosicion3D} posicionSolicitante - Coordenadas actuales del trabajador.
     * @param {boolean} tieneMaterial - Indica si el trabajador tiene piedra en su inventario.
     * @performance O(T) búsqueda lineal.
     * @contexto Asignación de trabajo eficiente priorizada (Issue #8 y #9).
     */
    public obtenerTareaDisponible(
        posicionSolicitante: IPosicion3D,
        tieneMaterial: boolean = false,
    ): ITarea | undefined {
        let tareaSeleccionada: ITarea | undefined = undefined;
        let minDistancia = Infinity;
        let maxPrioridad = -1; // Iniciamos con la prioridad más baja posible

        for (const tarea of this.cola) {
            if (tarea.estado === EstadoTarea.PENDIENTE) {
                // FILTRO ISSUE #9: Ocultar tareas de construcción si no hay material
                if (tarea.tipo === TipoTarea.CONSTRUIR && !tieneMaterial) continue;

                const d2 = Vec3.distanciaCuadrada(posicionSolicitante, tarea.posicion);
                const prioridadActual = tarea.prioridad;

                // LÓGICA MEJORADA: La prioridad manda. A igual prioridad, manda la distancia.
                if (prioridadActual > maxPrioridad || (prioridadActual === maxPrioridad && d2 < minDistancia)) {
                    maxPrioridad = prioridadActual;
                    minDistancia = d2;
                    tareaSeleccionada = tarea;
                }
            }
        }

        if (tareaSeleccionada) {
            console.log(
                `[DEBUG] Asignando tarea ${tareaSeleccionada.tipo} en X:${tareaSeleccionada.posicion.x}. (Prioridad: ${PrioridadTarea[tareaSeleccionada.prioridad]}).`
            );
        }

        return tareaSeleccionada;
    }

  /**
   * @description Marca una orden de trabajo como ocupada para que nadie más la tome.
   * @param {string} id - ID de la tarea.
   * @performance O(T)
   */
  public asignarTarea(id: string): void {
    const tarea = this.cola.find((t) => t.id === id);
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
    const index = this.cola.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.cola[index].estado = EstadoTarea.COMPLETADA;
      this.cola.splice(index, 1);
    }
  }
}
