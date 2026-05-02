// src/model/entidades/Draconiano.ts
import { IPosicion3D, INecesidades, EstadoIA, ITarea, TipoTarea, TipoBloque, IContextoSimulacion } from "../Tipos";
import { GestorTareas } from "../GestorTareas";
import { Mapa } from "../Mapa";
import { vec3 } from "../../utils/Vector3"


export class Draconiano {
    private progresoTrabajo: number = 0;
    private esfuersoPorTick: number = 25;

    readonly id: string;
    public nombre: string;
    public necesidades: INecesidades;
    public estres: number;
    public salud: number = 100; // Añadimos salud para el combate/hambre extrema
    public posicion: IPosicion3D;
    public estado: EstadoIA = EstadoIA.IDLE;
    public tareaActual: ITarea | null = null;
    public velocidad: number = 0.5; //Bloque por tick;

    constructor(id: string, nombre: string, x: number, y: number, z: number) {
        this.id = id;
        this.nombre = nombre;
        this.posicion = { x, y, z };
        this.estres = 0;
        this.necesidades = {
            hambre: 0,
            vejiga: 0,
            higiene: 0,
            descanso: 0,
            social: 0
        };
    }

    /**
     * El Controlador llamará a esto en cada tick del juego.
     * @param ratio Multiplicador de tiempo (por si queremos acelerar la simulación)
     * ademas, vamos a refactorizarlo para recivir el conxtecto del mundo
     */
    public actualizar(contexto: IContextoSimulacion): void {
        // Metabolismo Ahora usamos el contexto
        this.necesidades.hambre += 0.1 * contexto.ratio;
        this.necesidades.vejiga += 0.15 * contexto.ratio;
        this.necesidades.higiene += 0.05 * contexto.ratio;
        this.necesidades.descanso += 0.08 * contexto.ratio;

        // Lógica de estrés de tu versión
        if (this.necesidades.vejiga > 80 || this.necesidades.hambre > 80) {
            this.estres += 1 * contexto.ratio;
        }

        // Lógica de salud (si el estrés o hambre es crítico, la salud baja)
        if (this.estres > 90 || this.necesidades.hambre > 95) {
            this.salud -= 0.5 * contexto.ratio;
        }

        // Limitar valores entre 0 y 100 para evitar desbordamientos
        this.estres = Math.min(100, Math.max(0, this.estres));
        this.salud = Math.min(100, Math.max(0, this.salud));

        //2. Maquinas de Estados (cerebro), lo pasamos por contexto
        switch (this.estado) {
            case EstadoIA.IDLE:
                this.buscarTrabajo(contexto.gestor);
                break;
            case EstadoIA.MOVING:
                this.moverseATarea(contexto.gestor);
                break;
            case EstadoIA.WORKING:
                this.trabajar(contexto.gestor, contexto.mapa);
                break;
        }
    }

    public estaVivo(): boolean {
        return this.salud > 0;
    }

    private buscarTrabajo(gestor: GestorTareas): void {
        const tarea = gestor.obtenerTareaDisponible()
        console.log(`[DEBUG] ${this.nombre} buscando tarea. ¿Encontrada?: ${tarea !== undefined}`);
        // Sin este IF, el código sigue de largo y no hace nada
        if (tarea) {
            this.tareaActual = tarea;
            gestor.asignarTarea(tarea.id);

            // ¡LA CLAVE! Cambiamos el estado para que en el SIGUIENTE tick
            // el switch entre por el caso EstadoIA.MOVING
            this.estado = EstadoIA.MOVING;

            console.log(`[IA] ${this.nombre} ha aceptado la tarea: ${tarea.tipo} en ${tarea.posicion.x},${tarea.posicion.y}`);
        } else {
            // Opcional: un log para saber que buscó pero no había nada
            // console.log(`[IA] ${this.nombre} no encontró tareas disponibles.`);
        }
    }

    private moverseATarea(gestor: GestorTareas): void {
        if (!this.tareaActual) {
            this.estado = EstadoIA.IDLE;
            return;
        }

        const destino = this.tareaActual.posicion;

        //Calculamos la posición 3D simple
        const dist = vec3.distancia(this.posicion, this.tareaActual.posicion);

        if (dist < 0.5) {
            this.estado = EstadoIA.WORKING;
            console.log(`[IA] ${this.nombre} ha llegado al tajo.`);
        } else {
            //Moverse hacia el objetivo con la nueva utilidad matematica
            this.posicion = vec3.hacia(this.posicion, this.tareaActual.posicion, this.velocidad);
        }
    }

    private trabajar(gestor: GestorTareas, mapa: Mapa): void {
        if (!this.tareaActual) return;

        this.progresoTrabajo += this.esfuersoPorTick; //cada vez que se pique, se hace un progreso.

        if (this.progresoTrabajo >= 100) {
            //Efecto en el Mundo
            if (this.tareaActual.tipo === TipoTarea.PICAR) {
                const picar = this.tareaActual.posicion;
                mapa.setBloque(picar.x, picar.y, picar.z, TipoBloque.AIRE);
                console.log(`[MAPA] Bloque en ${picar.x},${picar.y},${picar.z} ha sido destrozado.`);
                // Aquí podrías añadir piedra al inventario de Kork:
                // this.inventario.set(TipoRecurso.PIEDRA, (this.inventario.get(TipoRecurso.PIEDRA) || 0) + 1);
            }


            //Aqui finalizamos la tarea
            gestor.finalizarTarea(this.tareaActual.id);
            this.tareaActual = null;
            this.progresoTrabajo = 0;
            this.estado = EstadoIA.IDLE;
            console.log(`[IA] ${this.nombre} ha terminado su trabajo y espera ordenes.`);
        }
    }
}