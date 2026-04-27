// src/model/Tipos.ts

export enum TipoRecurso {
    PIEDRA = "PIEDRA",
    GEMA = "GEMA",
    COMIDA = "COMIDA",
    AGUA = "AGUA"
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
    inventario: Map<TipoRecurso, number>;
}