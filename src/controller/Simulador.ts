import { Almacen } from "../model/entities/Almacen";
import { Draconiano } from "../model/entities/Draconiano";
import { GestorTareas } from "../model/GestorTareas";
import { Mapa } from "../model/Mapa";
import {
    EstadoIA,
    EstadoTarea,
    IContextoSimulacion,
    PrioridadTarea,
    TipoBloque,
    TipoTarea,
} from "../model/Tipos";
import { Vec3 } from "../utils/Vector3";

export class Simulador {
  // --- CONSTANTES DE BALANCEO (Regla #6) ---
  private readonly COSTE_RECLUTAMIENTO = 50;

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

  /**
   * @description Registra un nuevo habitante en el ciclo de actualización del motor.
   * @param {Draconiano} d - Instancia del trabajador.
   * @performance O(1) push al array denso.
   * @contexto Inicialización y crecimiento de la colonia.
   */
  public añadirDraconiano(d: Draconiano): void {
    this.entidades.push(d);
  }

  /**
   * @description Registra un nuevo almacén físico en el mundo.
   * @param {Almacen} a - Instancia del almacén.
   * @performance O(1) push al array denso.
   * @contexto Logística e inicialización.
   */
  public añadirAlmacen(a: Almacen): void {
    this.almacenes.push(a);
  }

  /**
   * @description Consume recursos del almacén principal para invocar a un nuevo trabajador.
   * @param {string} nombreAlmacen - El nombre del almacén de donde sacar la comida.
   * @contexto Crecimiento de colonia (Issue #15).
   */
  public intentarReclutar(nombreAlmacen: string): void {
      const almacen = this.almacenes.find(a => a.nombre === nombreAlmacen);
      if (!almacen) {
          console.warn(`[COLONIA] Almacén '${nombreAlmacen}' no encontrado.`);
          return;
      }

      const comidaActual = almacen.inventario.get(TipoBloque.COMIDA) || 0;

      if (comidaActual >= this.COSTE_RECLUTAMIENTO) {
          // Cobramos la comida
          almacen.inventario.set(TipoBloque.COMIDA, comidaActual - this.COSTE_RECLUTAMIENTO);
          
          // Calculamos el ID y nombre del nuevo colono
          const nuevoId = `d${this.entidades.length + 1}`;
          const nuevoNombre = `Clon-${this.entidades.length}`;
          
          // Creamos al nuevo clon (aparece encima del almacén)
          const nuevoDraconiano = new Draconiano(
              nuevoId, 
              nuevoNombre, 
              almacen.posicion.x, 
              almacen.posicion.y + 1, // FIX: Aparece justo encima del almacén (+1 en el eje Y)
              almacen.posicion.z
          );

          this.añadirDraconiano(nuevoDraconiano);
          console.log(`[COLONIA] ¡Ha nacido ${nuevoNombre}! Ha costado ${this.COSTE_RECLUTAMIENTO} de COMIDA. Quedan ${comidaActual - this.COSTE_RECLUTAMIENTO} en ${nombreAlmacen}.`);
      } else {
          console.warn(`[COLONIA] No hay suficiente comida para reclutar. Se necesitan ${this.COSTE_RECLUTAMIENTO}, hay ${comidaActual}.`);
      }
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

  /**
   * @description Proporciona acceso al tablón de tareas.
   * @performance O(1).
   */
  public getGestor(): GestorTareas {
    return this.gestorTareas;
  }

  /**
   * @description Permite observar la lista de entidades actuales en el motor.
   * @performance O(1).
   */
  public getEntidades(): Draconiano[] {
      return this.entidades;
  }

  /**
   * @description Serializa el estado global de la simulación empaquetando todos los submódulos.
   * @performance O(E + A + T) donde E=Entidades, A=Almacenes, T=Tareas.
   * @contexto Persistencia centralizada de la partida (Regla #7).
   */
  public toJSON(): string {
    // FIX GC FRIENDLY: Construimos la cadena JSON directamente para evitar dobles parseos
    // y no generar objetos literales anónimos masivos en RAM.
    const gestorJSON = this.gestorTareas.toJSON();
    const entidadesJSON = this.entidades.map(e => e.toJSON()).join(",");
    const almacenesJSON = this.almacenes.map(a => a.toJSON()).join(",");

    return `{"tickActual":${this.tickActual},"pausado":${this.pausado},"gestorTareas":${gestorJSON},"entidades":[${entidadesJSON}],"almacenes":[${almacenesJSON}]}`;
  }

  /**
   * @description Restaura atributos globales y coordina la carga de submódulos.
   * @param {string} json - Cadena JSON del savefile.
   * @performance O(E + A + T). 
   * @contexto Carga centralizada de la partida (Regla #7).
   */
  public fromJSON(json: string): void {
    try {
      const datos = JSON.parse(json);
      
      if (datos.tickActual !== undefined) this.tickActual = datos.tickActual;
      if (datos.pausado !== undefined) this.pausado = datos.pausado;
      
      if (datos.gestorTareas) {
        this.gestorTareas.fromJSON(JSON.stringify(datos.gestorTareas));
      }

      // Reconstrucción de Entidades
      if (datos.entidades && Array.isArray(datos.entidades)) {
        this.entidades = [];
        for (const eDatos of datos.entidades) {
            const d = new Draconiano(eDatos.id || "d_generico", eDatos.nombre || "Desconocido", 0, 0, 0);
            d.fromJSON(JSON.stringify(eDatos));
            this.entidades.push(d);
        }
      }

      // Reconstrucción de Almacenes
      if (datos.almacenes && Array.isArray(datos.almacenes)) {
        this.almacenes = [];
        for (const aDatos of datos.almacenes) {
            const a = new Almacen(aDatos.nombre || "Almacen", 0, 0, 0);
            a.fromJSON(JSON.stringify(aDatos));
            this.almacenes.push(a);
        }
      }

    } catch (error) {
      console.error("[SIMULADOR-ERROR] Fallo crítico al cargar el estado global de la simulación.", error);
    }
  }
}
