import { Mapa } from "../model/Mapa";
import { Draconiano } from "../model/entities/Draconiano";
import { GestorTareas } from "../model/GestorTareas";
import { Almacen } from "../model/entities/Almacen";
import { IContextoSimulacion, TipoTarea, PrioridadTarea, EstadoTarea, EstadoIA } from "../model/Tipos";
import { Vec3 } from "../utils/Vector3";

export class Simulador {
    private tickActual: number = 0;
    private mapa: Mapa;
    private entidades: Draconiano[] = [];
    private almacenes: Almacen[] = [];
    private gestorTareas: GestorTareas;
    private pausado: boolean = false;

    constructor(mapa: Mapa) {
        this.mapa = mapa;
        this.gestorTareas = new GestorTareas();
    }

    public añadirDraconiano(d: Draconiano): void { this.entidades.push(d); }
    public añadirAlmacen(a: Almacen): void { this.almacenes.push(a); }

    public procesarTick(): void {
        if (this.pausado) return;
        this.tickActual++;

        const contexto: IContextoSimulacion = {
            ratio: 1,
            gestor: this.gestorTareas,
            mapa: this.mapa,
            tickActual: this.tickActual
        };

        this.entidades.forEach(entidad => {
            if (!entidad.estaVivo()) return;

            // PRIORIDAD LOGÍSTICA: Si está lleno, forzar DEPOSITAR
            if (entidad.getCargaActual() >= entidad.getCapacidadMax()) {
                if (entidad.tareaActual?.tipo !== TipoTarea.DEPOSITAR) {
                    this.asignarAlmacenMasCercano(entidad);
                }
            }

            entidad.actualizar(contexto);
        });
    }

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
            estado: EstadoTarea.ASIGNADA
        };
        entidad.estado = EstadoIA.MOVING;
        console.log(`[SIM] Redirigiendo a ${entidad.nombre} al almacén ${cercano.nombre}.`);
    }

    public getGestor(): GestorTareas { return this.gestorTareas; }
}