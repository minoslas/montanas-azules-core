// src/model/GestorTareas.ts
import { Vec3 } from "../utils/Vector3";
import {
    EstadoTarea,
    IPosicion3D,
    ITarea,
    PrioridadTarea,
    TipoTarea,
} from "./Tipos";

export class GestorTareas {
  private cola: ITarea[] = [];

  /**
   * @description Añade una nueva solicitud al tablón de trabajo.
   * @param {TipoTarea} tipo - Acción requerida.
   * @param {IPosicion3D} posicion - Coordenada de la tarea.
   * @param {PrioridadTarea} [prioridad=PrioridadTarea.Media] - Nivel de prioridad asignado a la tarea.
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
        if (
          prioridadActual > maxPrioridad ||
          (prioridadActual === maxPrioridad && d2 < minDistancia)
        ) {
          maxPrioridad = prioridadActual;
          minDistancia = d2;
          tareaSeleccionada = tarea;
        }
      }
    }

    if (tareaSeleccionada) {
      console.log(
        `[DEBUG] Asignando tarea ${tareaSeleccionada.tipo} en X:${tareaSeleccionada.posicion.x}. (Prioridad: ${PrioridadTarea[tareaSeleccionada.prioridad]}).`,
      );
    }

    return tareaSeleccionada;
  }

  /**
   * @description Marca una orden de trabajo como ocupada para que nadie más la tome.
   * @param {string} id - ID de la tarea.
   * @performance O(T)
   * @contexto Control de concurrencia de tareas.
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
   * @contexto Gestión de memoria activa y cierre de ciclo laboral.
   */
  public finalizarTarea(id: string): void {
    const index = this.cola.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.cola[index].estado = EstadoTarea.COMPLETADA;
      this.cola.splice(index, 1);
    }
  }

  /**
   * @description Serializa la cola de tareas a JSON.
   * @performance O(T) donde T es el número de tareas en cola.
   * @contexto Persistencia y serialización de mundo (Regla #7).
   */
  public toJSON(): string {
    return JSON.stringify({ cola: this.cola });
  }

  /**
   * @description Deserializa la cola de tareas desde JSON.
   * @param {string} json - Cadena JSON.
   * @performance O(T) de reconstrucción. Reasigna la cola evitando objetos intermedios.
   * @contexto Persistencia y serialización de mundo (Regla #7).
   */
  public fromJSON(json: string): void {
    try {
      const datos = JSON.parse(json);
      if (datos && Array.isArray(datos.cola)) {
        this.cola = datos.cola;
      }
    } catch (error) {
      console.error("[GESTOR-ERROR] Fallo crítico al deserializar las tareas.", error);
    }
  }
}
