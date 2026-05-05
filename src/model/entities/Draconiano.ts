import { IContextoSimulacion, EstadoIA, ITarea, IInventario, TipoBloque, TipoTarea, INecesidades, IPosicion3D } from "../Tipos";
import { Vec3 } from "../../utils/Vector3";
import { GestorTareas } from "../GestorTareas";
import { Mapa } from "../Mapa";

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

    public estaVivo(): boolean { return this.salud > 0; }
    public getCargaActual(): number { return this.inventario.cargaActual; }
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

    public actualizar(ctx: IContextoSimulacion): void {
        if(!this.estaVivo()) return;

        this.procesarMetabolismo(ctx);

        // Árbol de decisión de prioridades (FSM)
        if (this.necesidades.salud <= 0) {
            this.morir();
            return; 
        }

        // PRIORIDAD VITAL: Si hay peligro, abortamos la minería inmediatamente
        if (this.necesidades.hambre > 85  || this.necesidades.sed > 85) {
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

    private procesarMetabolismo(ctx: IContextoSimulacion): void {
        const ratio = ctx.ratio;
        this.necesidades.hambre += 0.1 * ratio; 
        this.necesidades.sed += 0.15 * ratio; 
        this.necesidades.descanso += 0.05 * ratio; // FIX: Balanceado para no quedarse dormido instantáneamente

        if(this.necesidades.hambre >= 100 || this.necesidades.sed >= 100) {
            this.salud -= 1 * ratio; 
            if(ctx.tickActual % 10 === 0) console.log(`[PELIGRO] ${this.nombre} está muriendo de inanición/deshidratación...`);
        }
    }

    private buscarTrabajo(gestor: GestorTareas): void {
        // Solo buscamos trabajo si hay espacio en la mochila
        if (this.getCargaActual() >= this.getCapacidadMax()) return;

        const tarea = gestor.obtenerTareaDisponible();
        if (tarea) {
            this.tareaActual = tarea;
            gestor.asignarTarea(tarea.id);
            this.estado = EstadoIA.MOVING;
        }
    }

    private moverseATarea(): void {
        if (!this.tareaActual) { 
            // Si nos cancelan la tarea en pleno viaje, volvemos a IDLE (solo si no es supervivencia)
            if (this.estado !== EstadoIA.BUSCAR_RECURSO) this.estado = EstadoIA.IDLE; 
            return; 
        }

        const destino = this.tareaActual.posicion;
        const distancia = Vec3.distancia(this.posicion, destino);

        if (distancia < 0.2) {
            // Si íbamos a por recursos (DEPOSITAR/CONSUMIR), ejecutamos directamente
            if (this.estado === EstadoIA.BUSCAR_RECURSO) {
                this.ejecutarDescarga(); // Reutilizamos este método o creamos uno de consumir
            } else {
                this.estado = EstadoIA.WORKING;
                console.log(`[IA] ${this.nombre} ha llegado al tajo.`);
            }
        } else {
            this.posicion = Vec3.hacia(this.posicion, destino, this.velocidad);
        }
    }

    private trabajar(gestor: GestorTareas, mapa: Mapa): void {
        if (!this.tareaActual) return;

        if (this.tareaActual.tipo === TipoTarea.DEPOSITAR) {
            this.ejecutarDescarga();
            return;
        }

        this.progresoTrabajo += this.esfuerzoPorTick;

        if (this.progresoTrabajo >= 100) {
            this.finalizarMineria(gestor, mapa);
        }
    }

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

    private ejecutarDescarga(): void {
        this.inventario.items.clear();
        this.inventario.cargaActual = 0;
        this.limpiarEstado();
        console.log(`[LOGÍSTICA] ${this.nombre} vació su mochila.`);
    }

    private limpiarEstado(): void {
        this.tareaActual = null;
        this.progresoTrabajo = 0;
        this.estado = EstadoIA.IDLE;
    }

    private morir(): void {
        // En lugar de solo imprimir, forzamos un estado final si quisieras renderizar un cadáver
        console.log(`[💀] ${this.nombre} ha perecido en las minas. El valle cobra su tributo.`);
    }
}