import { IContextoSimulacion, EstadoIA, ITarea, IInventario, TipoBloque, TipoTarea, INecesidades, IPosicion3D } from "../Tipos";
import { Vec3 } from "../../utils/Vector3";
import { GestorTareas } from "../GestorTareas";
import { Mapa } from "../Mapa";

export class Draconiano {
    readonly id: string;
    public nombre: string;
    public posicion: IPosicion3D;
    public necesidades: INecesidades;
    public salud: number = 100;
    public estado: EstadoIA = EstadoIA.IDLE;
    public tareaActual: ITarea | null = null;
    public velocidad: number = 0.5;

    private inventario: IInventario;
    private progresoTrabajo: number = 0;
    private esfuerzoPorTick: number = 25; //

    constructor(id: string, nombre: string, x: number, y: number, z: number) {
        this.id = id;
        this.nombre = nombre;
        this.posicion = { x, y, z };
        this.necesidades = { hambre: 0, vejiga: 0, higiene: 0, descanso: 0, social: 0 };
        this.inventario = { 
            // CORRECCIÓN ERROR 2345: Definimos explícitamente los tipos del Map
            items: new Map<TipoBloque, number>(), 
            capacidadMax: 10, 
            cargaActual: 0 
        };
    }

    public actualizar(ctx: IContextoSimulacion): void {
        this.necesidades.hambre += 0.05 * ctx.ratio;

        switch (this.estado) {
            case EstadoIA.IDLE:
                // Solo busca trabajo si tiene espacio[cite: 3]
                if (this.inventario.cargaActual < this.inventario.capacidadMax) {
                    this.buscarTrabajo(ctx.gestor);
                }
                break;
            case EstadoIA.MOVING:
                this.moverseATarea();
                break;
            case EstadoIA.WORKING:
                this.trabajar(ctx.gestor, ctx.mapa);
                break;
        }
    }

    private buscarTrabajo(gestor: GestorTareas): void {
        const tarea = gestor.obtenerTareaDisponible();
        if (tarea) {
            this.tareaActual = tarea;
            gestor.asignarTarea(tarea.id);
            this.estado = EstadoIA.MOVING;
        }
    }

    private moverseATarea(): void {
        if (!this.tareaActual) { this.estado = EstadoIA.IDLE; return; }

        const destino = this.tareaActual.posicion;
        const distancia = Vec3.distancia(this.posicion, destino);

        if (distancia < 0.2) {
            this.estado = EstadoIA.WORKING;
            console.log(`[IA] ${this.nombre} ha llegado al objetivo.`);
        } else {
            // Movimiento corregido usando la utilidad vectorial[cite: 3]
            this.posicion = Vec3.hacia(this.posicion, destino, this.velocidad);
        }
    }

    private trabajar(gestor: GestorTareas, mapa: Mapa): void {
        if (!this.tareaActual) return;

        // Si es tarea de depósito, la descarga es instantánea al llegar
        if (this.tareaActual.tipo === TipoTarea.DEPOSITAR) {
            this.ejecutarDescarga();
            return;
        }

        // Lógica de minería (Progreso)
        this.progresoTrabajo += this.esfuerzoPorTick;
        console.log(`[TRABAJO] ${this.nombre} picando... ${this.progresoTrabajo}%`);

        if (this.progresoTrabajo >= 100) {
            this.finalizarMineria(gestor, mapa);
        }
    }

    private finalizarMineria(gestor: GestorTareas, mapa: Mapa): void {
        const p = this.tareaActual!.posicion;

        // CARGA FÍSICA DE LA MOCHILA: Aquí se resuelve tu duda[cite: 3]
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
        // Vaciamos mochila[cite: 3]
        this.inventario.items.clear();
        this.inventario.cargaActual = 0;
        this.limpiarEstado();
        console.log(`[LOGÍSTICA] ${this.nombre} vació su mochila en el almacén.`);
    }

    private limpiarEstado(): void {
        this.tareaActual = null;
        this.progresoTrabajo = 0;
        this.estado = EstadoIA.IDLE;
    }

    public estaVivo(): boolean { return this.salud > 0; }
    public getCargaActual(): number { return this.inventario.cargaActual; }
    public getCapacidadMax(): number { return this.inventario.capacidadMax; }
}