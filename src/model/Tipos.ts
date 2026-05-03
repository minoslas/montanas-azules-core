// src/model/Tipos.ts

import { GestorTareas } from "./GestorTareas";
import { Mapa } from "./Mapa";

export enum TipoBloque {
    PIEDRA = "PIEDRA",
    AIRE = "AIRE",
    GEMA = "GEMA",
    COMIDA = "COMIDA",
    AGUA = "AGUA",
    MINERAL = "MINERAL",
    OBJETO = "OBJETO"
}

export enum TipoTarea {
    PICAR = "PICAR",
    DEPOSITAR = "DEPOSITAR",
    CONSTRUIR = "COSTRUIR",
    RECOGER = "RECOGER",
    TRANSPORTAR = "TRANSPORTAR",
    DECONSTRUIR = "DECONSTRUIR",
    LIMPIAR = "LIMPIAR",
    PULIR = "PULIR",
    COCINAR = "COCINAR",
    CURANDO = "CURANDO"
}

export enum EstadoTarea {
    PENDIENTE,
    ASIGNADA,
    COMPLETADA,
}

export enum EstadoIA {
    IDLE, //BUSCANDO TRABAJO O DESCANSANDO
    MOVING, //MOVIENDOSE A UNA TAREA
    WORKING, //TRABAJANDO EN UNA TAREA
    LUCHANDO, //COMBATIENDO O DEFENDIENDOSE
}

export enum Profesiones {
    Minero, 
    Artesano,
    Militar,
    Armero,
    ForjadorDeArmas,
    Medico,
    Alguacil,
    Posadero
}

export interface ITarea {
    id: string;
    tipo: TipoTarea;
    posicion: IPosicion3D;
    prioridad: PrioridadTarea;
    estado: EstadoTarea;
}

export interface IPosicion3D {
    x: number;
    y: number;
    z: number;
}

export interface IDraconiano {
    id: string;
    nombre: string;
    salud: number;
    hambre: number;
    posicion: IPosicion3D;
    inventario: Map<TipoBloque, number>;
}

// src/model/Tipos.ts

export enum PrioridadTarea {
    Baja,
    Media,
    Alta,
    Critica
}

export interface INecesidades {
    hambre: number;
    vejiga: number;
    higiene: number;
    descanso: number;
    social: number;
}

//aqui simplificamos mucho codigo...
export interface IContextoSimulacion {
    ratio: number;
    gestor: GestorTareas;
    mapa: Mapa;
    tickActual: number;
}

/**
 * Representa el inventario limitado de un trabajador.
 * @capacidadMax 10 unidades para no sobrecargar el objeto en memoria.
 * Mas adelante, tal vez el factor de capacidad maxima este basado en la fuerza del draconiano
 */
export interface IInventario {
    // CORRECCIÓN: La clave es el Enum TipoBloque y el valor es la cantidad (number)
    items: Map<TipoBloque, number>; 
    capacidadMax: number;
    cargaActual: number;
}

