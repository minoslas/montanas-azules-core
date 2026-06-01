// src/model/GestorTareas.ts
import { Vec3 } from "../utils/Vector3";
import {
    EstadoTarea,
    IContextoSimulacion,
    IPosicion3D,
    ITarea,
    PrioridadTarea,
    TipoBloque,
    TipoTarea
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
   * @param {IContextoSimulacion} ctx - Contexto global inyectado.
   * @param {IPosicion3D} posicionSolicitante - Coordenadas actuales del trabajador.
   * @param {boolean} tieneMaterial - Indica si el trabajador tiene piedra en su inventario.
   * @performance O(T) búsqueda lineal.
   * @contexto Asignación de trabajo eficiente priorizada (Issue #8 y #9).
   */
  public obtenerTareaDisponible(
    ctx: IContextoSimulacion,
    posicionSolicitante: IPosicion3D,
    tieneMaterial: boolean = false
  ): ITarea | undefined {
    let tareaSeleccionada: ITarea | undefined = undefined;
    let minDistancia = Infinity;
    let maxPrioridad = -1; // Iniciamos con la prioridad más baja posible

    const esAccesible = (b: TipoBloque) => b === TipoBloque.AIRE || b === TipoBloque.AGUA;

    for (const tarea of this.cola) {
      let penalizacionTecho = 0;
      if (tarea.estado === EstadoTarea.PENDIENTE) {
        // FIX: Ignorar tareas inalcanzables castigadas temporalmente
        if (tarea.bloqueadaHasta && tarea.bloqueadaHasta > ctx.tickActual) continue;

        // FILTRO ISSUE #9: Ocultar tareas de construcción si no hay material
        if (tarea.tipo === TipoTarea.CONSTRUIR && !tieneMaterial) continue;

        // FILTRO DE SUPERFICIE: Evita bloqueos de CPU y solapamientos ignorando bloques enterrados
        if (tarea.tipo === TipoTarea.PICAR || tarea.tipo === TipoTarea.RECOLECTAR) {
            const p = tarea.posicion;
            const expuestoHor = 
                esAccesible(ctx.mapa.getBloque(p.x+1, p.y, p.z)) ||
                esAccesible(ctx.mapa.getBloque(p.x-1, p.y, p.z)) ||
                esAccesible(ctx.mapa.getBloque(p.x, p.y, p.z+1)) ||
                esAccesible(ctx.mapa.getBloque(p.x, p.y, p.z-1));
                
            const expuestoVer = 
                esAccesible(ctx.mapa.getBloque(p.x, p.y+1, p.z)) ||
                esAccesible(ctx.mapa.getBloque(p.x, p.y-1, p.z));

            if (!expuestoHor && !expuestoVer) continue;
            
            // Penalizamos si el bloque solo está expuesto por el techo.
            // Obliga a priorizar talar la montaña desde las paredes laterales.
            if (!expuestoHor) penalizacionTecho = 150;
        }

        const d2 = Vec3.distanciaCuadrada(posicionSolicitante, tarea.posicion);
        // Penalizamos fuertemente tareas a distinta altura para que no escalen montañas si hay trabajo abajo
        const penalizacionAltura = Math.abs(posicionSolicitante.y - tarea.posicion.y) * 100;
        const distanciaReal = d2 + penalizacionAltura + penalizacionTecho;

        const prioridadActual = tarea.prioridad;

        // LÓGICA MEJORADA: La prioridad manda. A igual prioridad, manda la distancia.
        if (
          prioridadActual > maxPrioridad ||
          (prioridadActual === maxPrioridad && distanciaReal < minDistancia)
        ) {
          maxPrioridad = prioridadActual;
          minDistancia = distanciaReal;
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
   * @description Devuelve una tarea fallida a la cola, reduciendo su prioridad para evitar bloqueos.
   * @param {string} id - ID de la tarea inalcanzable.
   * @param {number} [tickActual] - Opcional, tick para aplicar el bloqueo temporal.
   * @contexto Solución al Efecto Cebolla (Issue #18).
   */
  public reprogramarTarea(id: string, tickActual?: number): void {
    const tarea = this.cola.find(t => t.id === id);
    if (tarea) {
        tarea.estado = EstadoTarea.PENDIENTE;
        // La degradamos a Baja. Así los clones preferirán minar los bloques expuestos primero.
        tarea.prioridad = PrioridadTarea.Baja; 
        if (tickActual !== undefined) {
            // Descansamos de esta tarea durante 50 ticks para priorizar el resto del tablero
            tarea.bloqueadaHasta = tickActual + 50; 
        }
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
