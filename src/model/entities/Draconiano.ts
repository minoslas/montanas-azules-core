import { IContextoSimulacion, EstadoIA, ITarea, IInventario, TipoBloque, TipoTarea, INecesidades, IPosicion3D } from "../Tipos";
import { Vec3 } from "../../utils/Vector3";
import { GestorTareas } from "../GestorTareas";
import { Mapa } from "../Mapa";

/**
 * @description Entidad principal que representa a un habitante de la colonia. Se basa en una máquina de estados (FSM).
 * @performance O(1) por tick. Mantiene un tamaño en memoria acotado.
 * @contexto Entidad central del Modelo, independiente del Controlador y la Vista (MVC Estricto).
 */
export class Draconiano {
    readonly id: string;

    private inventario: IInventario;
    private progresoTrabajo: number = 0;
    private esfuerzoPorTick: number = 25; 

    public nombre: string;
    public posicion: IPosicion3D;
    public necesidades: INecesidades;
    public salud: number = 100;
    public estado: EstadoIA = EstadoIA.IDLE;
    public tareaActual: ITarea | null = null;
    public velocidad: number = 0.5;

    /**
     * @description Verifica integridad vital básica.
     * @performance O(1) 
     */
    public estaVivo(): boolean { return this.salud > 0; }
    
    /**
     * @description Devuelve los slots ocupados de la mochila.
     * @performance O(1)
     */
    public getCargaActual(): number { return this.inventario.cargaActual; }
    /**
     * @description Capacidad máxima en slots configurada al iniciar.
     * @performance O(1)
     */
    public getCapacidadMax(): number { return this.inventario.capacidadMax; }

    constructor(id: string, nombre: string, x: number, y: number, z: number) {
        this.id = id;
        this.nombre = nombre;
        this.posicion = { x, y, z };
        this.necesidades = { hambre: 0, sed: 0, descanso: 0, salud: 100, vejiga: 0, higiene: 0, social: 0 };
        this.inventario = { 
            items: new Map<TipoBloque, number>(), 
            capacidadMax: 10, 
            cargaActual: 0 
        };
    }

    /**
     * @description Actualiza el estado metabólico y la máquina de estados (FSM) del draconiano en este tick.
     * @param {IContextoSimulacion} ctx - Contexto de la simulación con herramientas y ratio temporal.
     * @performance O(1), no genera instanciación de objetos anónimos nuevos, amigable con el GC.
     * @contexto Comunicación por Contexto (Guía de Estilo #1).
     */
    public actualizar(ctx: IContextoSimulacion): void {
        if(!this.estaVivo()) return;

        this.procesarMetabolismo(ctx);

        // Árbol de decisión de prioridades (FSM)
        if (this.necesidades.salud <= 0) {
            this.morir();
            return; 
        }

        // --- EL BUGFIX ESTÁ AQUÍ ---
        // Comprobamos si el Simulador YA le ha dado el mapa hacia el oasis
        const yaEstaSalvandose = this.tareaActual?.tipo === TipoTarea.CONSUMIR;

        // PRIORIDAD VITAL: Si hay peligro, abortamos la minería inmediatamente
        if ((this.necesidades.hambre > 85  || this.necesidades.sed > 85) && !yaEstaSalvandose) {
            if(this.estado !== EstadoIA.BUSCAR_RECURSO){
                console.log(`[ALERTA] ${this.nombre} abandona su tarea por instinto de supervivencia.`);
                this.estado = EstadoIA.BUSCAR_RECURSO;
                this.tareaActual = null; // Soltamos la tarea actual para que vuelva al Gestor
            }
        }

        switch (this.estado) {
            case EstadoIA.IDLE:
                this.buscarTrabajo(ctx.gestor);
                break;
            case EstadoIA.MOVING:
                this.moverseATarea();
                break;
            case EstadoIA.WORKING:
                this.trabajar(ctx.gestor, ctx.mapa);
                break;
            case EstadoIA.BUSCAR_RECURSO:
                // FIX DEL BUCLE: Si estamos buscando recursos, esperamos la orden del Simulador.
                // NO volvemos a IDLE si no tenemos tarea.
                if (this.tareaActual) {
                    this.moverseATarea();
                } else if (ctx.tickActual % 5 === 0) {
                    // Mensaje esporádico para no saturar la consola
                    console.log(`[IA] ${this.nombre} brama pidiendo comida/agua...`);
                }
                break;
        }
    }

    /**
     * @description Actualiza el nivel de hambre, sed y descanso, restando salud si llegan a niveles críticos.
     * @param {IContextoSimulacion} ctx - Contexto inyectado en el tick actual.
     * @performance O(1). Modifica primitivos directamente.
     * @contexto Mecánica vital de supervivencia.
     */
    private procesarMetabolismo(ctx: IContextoSimulacion): void {
        const ratio = ctx.ratio;

        // modificado en modo test extricto para que actue agua y sed
        this.necesidades.hambre += 0.1 * ratio; 
        this.necesidades.sed += 0.15 * ratio; 
        this.necesidades.descanso += 0.05 * ratio;

        if(this.necesidades.hambre >= 100 || this.necesidades.sed >= 100) {
            this.salud -= 1 * ratio; 
            if(ctx.tickActual % 10 === 0) console.log(`[PELIGRO] ${this.nombre} está muriendo de inanición/deshidratación...`);
        }
    }

    /**
     * @description Intenta asignar la tarea espacialmente más cercana al draconiano si tiene capacidad en su inventario.
     * @param {GestorTareas} gestor - Gestor de tareas inyectado vía contexto.
     * @performance O(N) donde N es el número de tareas en cola. Delegado al Gestor.
     * @contexto Autogestión laboral para el ciclo de IDLE optimizado por vecindad.
     */
    private buscarTrabajo(gestor: GestorTareas): void {
        // Solo buscamos trabajo si hay espacio en la mochila
        if (this.getCargaActual() >= this.getCapacidadMax()) return;

        // Pasamos nuestra posición para que el Gestor calcule la proximidad
        const tarea = gestor.obtenerTareaDisponible(this.posicion);
        if (tarea) {
            this.tareaActual = tarea;
            gestor.asignarTarea(tarea.id);
            this.estado = EstadoIA.MOVING;
        }
    }

    /**
     * @description Desplaza la entidad hacia el destino de su tarea usando utilidades vectoriales.
     * @performance O(1) en cálculos matemáticos delegados a utilidades externas (Vec3).
     * @contexto Cumple regla #3 de Matemáticas Vectoriales sin recálculos euclidianos crudos.
     */
    private moverseATarea(): void {
        if (!this.tareaActual) { 
            // Si nos cancelan la tarea en pleno viaje, volvemos a IDLE (solo si no es supervivencia)
            if (this.estado !== EstadoIA.BUSCAR_RECURSO) this.estado = EstadoIA.IDLE; 
            return; 
        }

        const destino = this.tareaActual.posicion;
        const distancia = Vec3.distancia(this.posicion, destino);

        if (distancia < 0.2) {
            // LLEGAMOS AL DESTINO. ¿A QUÉ VENÍAMOS?
            if (this.tareaActual.tipo === TipoTarea.CONSUMIR) {
                this.ejecutarConsumo(); // CRÍTICO: Paréntesis añadidos y nombre corregido
            } else if (this.tareaActual.tipo === TipoTarea.DEPOSITAR) {
                this.ejecutarDescarga(); // RESTAURADO: Necesario para vaciar la mochila de piedra
            } else {
                this.estado = EstadoIA.WORKING;
                console.log(`[IA] ${this.nombre} ha llegado al tajo.`);
            }
        } else {
            this.posicion = Vec3.hacia(this.posicion, destino, this.velocidad);
        }
    }

    // Nombre corregido para mantener consistencia con ejecutarDescarga
    /**
     * @description Restaura las necesidades vitales del draconiano y aplica curación pasiva.
     * @performance O(1), mutación de variables primitivas.
     * @contexto Cierre del ciclo de tarea vital (consumir agua o comida).
     */
    private ejecutarConsumo(): void {
        console.log(`[SUPERVIVENCIA] ${this.nombre} se está alimentando/hidratando.`);
        
        // Reseteamos las necesidades críticas
        this.necesidades.hambre = 0;
        this.necesidades.sed = 0;
        
        // Un poco de curación pasiva por haber sobrevivido
        if (this.salud < 100) {
            this.salud += 10;
        }

        this.limpiarEstado();
        console.log(`[IA] ${this.nombre} ha recuperado fuerzas y vuelve al trabajo.`);
    }

    /**
     * @description Acumula progreso en la tarea actual. Desencadena la finalización al llegar al 100%.
     * @param {GestorTareas} gestor - Referencia temporal al gestor.
     * @param {Mapa} mapa - Referencia temporal al mapa (Sparse Voxel Grid).
     * @performance O(1).
     */
    private trabajar(gestor: GestorTareas, mapa: Mapa): void {
        if (!this.tareaActual) return;

        // Guardia de seguridad: si por algún motivo entra a trabajar con tarea de depositar
        if (this.tareaActual.tipo === TipoTarea.DEPOSITAR) {
            this.ejecutarDescarga();
            return;
        }

        this.progresoTrabajo += this.esfuerzoPorTick;

        if (this.progresoTrabajo >= 100) {
            this.finalizarMineria(gestor, mapa);
        }
    }

    /**
     * @description Concluye una tarea minera: añade recurso al inventario y cambia el mapa a AIRE.
     * @param {GestorTareas} gestor - Gestor para marcar la finalización (limpieza en RAM de la tarea).
     * @param {Mapa} mapa - Para reemplazar el bloque picado por AIRE.
     * @performance O(1) impacto en la estructura Map del mapa.
     */
    private finalizarMineria(gestor: GestorTareas, mapa: Mapa): void {
        const p = this.tareaActual!.posicion;

        if (this.inventario.cargaActual < this.inventario.capacidadMax) {
            const actual = this.inventario.items.get(TipoBloque.PIEDRA) || 0;
            this.inventario.items.set(TipoBloque.PIEDRA, actual + 1);
            this.inventario.cargaActual++;
            console.log(`[INV] ${this.nombre} cargó PIEDRA (${this.inventario.cargaActual}/10).`);
        }

        mapa.setBloque(p.x, p.y, p.z, TipoBloque.AIRE);
        gestor.finalizarTarea(this.tareaActual!.id);
        this.limpiarEstado();
    }

    /**
     * @description Vacía la carga en el almacén logístico.
     * @performance O(1). Usa .clear() del Map para ser amigable con la RAM y el GC.
     * @contexto Logística de inventario (Regla de Memoria).
     */
    private ejecutarDescarga(): void {
        this.inventario.items.clear();
        this.inventario.cargaActual = 0;
        this.limpiarEstado();
        console.log(`[LOGÍSTICA] ${this.nombre} vació su mochila.`);
    }

    /**
     * @description Limpia el progreso y la tarea para dejar a la entidad libre.
     * @performance O(1) limpieza de punteros (GC Friendly).
     * @contexto Retorno al estado neutral IDLE.
     */
    private limpiarEstado(): void {
        this.tareaActual = null;
        this.progresoTrabajo = 0;
        this.estado = EstadoIA.IDLE;
    }

    /**
     * @description Manejador de evento final cuando la salud llega a 0.
     * @performance O(1)
     */
    private morir(): void {
        console.log(`[💀] ${this.nombre} ha perecido en las minas. El valle cobra su tributo.`);
    }
}