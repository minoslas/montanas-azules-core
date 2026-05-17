import { Mapa } from "../model/Mapa";
import { Draconiano } from "../model/entities/Draconiano";
import { GestorTareas } from "../model/GestorTareas";
import { Almacen } from "../model/entities/Almacen";
import {
  IContextoSimulacion,
  TipoTarea,
  PrioridadTarea,
  EstadoTarea,
  EstadoIA,
  TipoBloque,
} from "../model/Tipos";
import { Vec3 } from "../utils/Vector3";

export class Simulador {
  private tickActual: number = 0;
  private mapa: Mapa;
  private entidades: Draconiano[] = [];
  private almacenes: Almacen[] = [];
  private gestorTareas: GestorTareas;
  private pausado: boolean = false;
  private contextoGlobal: IContextoSimulacion;

  constructor(mapa: Mapa) {
    this.mapa = mapa;
    this.gestorTareas = new GestorTareas();
    this.contextoGlobal = {
      gestor: this.gestorTareas,
      mapa: this.mapa,
      tickActual: 0,
      ratio: 1.0,
      almacenes: this.almacenes,
    };
  }

  public añadirDraconiano(d: Draconiano): void {
    this.entidades.push(d);
  }
  public añadirAlmacen(a: Almacen): void {
    this.almacenes.push(a);
  }

  /**
   * @description Corazón del bucle de juego. Orquesta la actualización inyectando contexto.
   * @performance O(E) donde E es el número de entidades.
   * @contexto Propiedad Única del Controlador (Guía #1).
   */
  public procesarTick(): void {
    if (this.pausado) return;
    this.tickActual++;

    // Regla #2: Reutilizar instancia para no saturar el GC
    this.contextoGlobal.tickActual = this.tickActual;

    this.entidades.forEach((entidad) => {
      if (!entidad.estaVivo()) return;

      // PRIORIZAR SUPERVIVENCIA: Si está con hambre, se forzará a ir a COMER
      if (entidad.estado === EstadoIA.BUSCAR_RECURSO && !entidad.tareaActual) {
        this.asignarRecursoVital(entidad);
      }

      // PRIORIDAD LOGÍSTICA: Si está lleno, forzar DEPOSITAR
      else if (
        entidad.getCargaActual() >= entidad.getCapacidadMax() &&
        entidad.estado !== EstadoIA.BUSCAR_RECURSO
      ) {
        if (entidad.tareaActual?.tipo !== TipoTarea.DEPOSITAR) {
          this.asignarAlmacenMasCercano(entidad);
        }
      }

      entidad.actualizar(this.contextoGlobal);
    });
  }

  /**
   * @description Crea una orden crítica para salvar la vida de la entidad redirigiéndola al almacén.
   * @param {Draconiano} entidad - El sujeto en peligro.
   * @performance O(A) donde A es el total de almacenes, búsqueda lineal de cercanía.
   * @contexto Gestión de crisis vitales de colonos.
   */
  private asignarRecursoVital(entidad: Draconiano) {
    //¿que se necesita mas? el agua mata mas que el hambre
    const necesitaAgua = entidad.necesidades.sed >= entidad.necesidades.hambre;
    const recursoBuscado = necesitaAgua ? TipoBloque.AGUA : TipoBloque.COMIDA;

    //Se busca el almacen mas cercano con el recurso necesario
    let almacenDestino = null;
    let minDist = Infinity;

    for (const a of this.almacenes) {
      // En el almacen, el inventario debe ser de un Map<TipoBloque, number>
      const cantidad = a.inventario.get(recursoBuscado) || 0;

      if (cantidad > 0) {
        const d = Vec3.distancia(entidad.posicion, a.posicion);
        if (d < minDist) {
          minDist = d;
          almacenDestino = a;
        }
      }
    }

    if (almacenDestino) {
      // Creamos la tarea para salvarle la vida
      entidad.tareaActual = {
        id: `supervivencia_${entidad.id}_${this.tickActual}`,
        tipo: TipoTarea.CONSUMIR,
        posicion: almacenDestino.posicion,
        prioridad: PrioridadTarea.Critica,
        estado: EstadoTarea.ASIGNADA,
      };
      entidad.estado = EstadoIA.MOVING;
      console.log(
        `[SIM] Emergencia vital: Redirigiendo a ${entidad.nombre} a por ${recursoBuscado}.`,
      );
    } else {
      // Crisis en la colonia: No hay recursos
      if (this.tickActual % 10 === 0) {
        console.warn(
          `[SIM-ALERTA] ¡Las reservas de ${recursoBuscado} están vacías! ${entidad.nombre} no tiene a dónde ir.`,
        );
      }
    }
  }

  /**
   * @description Envía al draconiano al almacén más cercano para descargar cuando su inventario está lleno.
   * @param {Draconiano} entidad - El minero lleno de recursos.
   * @performance O(A) cálculo de distancia contra todos los almacenes.
   * @contexto Optimización de logística de carga (Issue #11).
   */
  private asignarAlmacenMasCercano(entidad: Draconiano): void {
    if (this.almacenes.length === 0) return;

    let cercano = this.almacenes[0];
    let minDist = Vec3.distancia(entidad.posicion, cercano.posicion);

    // Bucle de búsqueda corregido
    for (const a of this.almacenes) {
      const d = Vec3.distancia(entidad.posicion, a.posicion);
      if (d < minDist) {
        minDist = d;
        cercano = a;
      }
    }

    entidad.tareaActual = {
      id: `deposito_${entidad.id}_${Date.now()}`,
      tipo: TipoTarea.DEPOSITAR,
      posicion: cercano.posicion,
      prioridad: PrioridadTarea.Critica,
      estado: EstadoTarea.ASIGNADA,
    };
    entidad.estado = EstadoIA.MOVING;
    console.log(
      `[SIM] Redirigiendo a ${entidad.nombre} al almacén ${cercano.nombre}.`,
    );
  }

  public getGestor(): GestorTareas {
    return this.gestorTareas;
  }
}
