// src/model/Tipos.ts

import { GestorTareas } from "./GestorTareas";
import { Mapa } from "./Mapa";

/**
 * @description Identificadores de los tipos de bloques del Voxel Grid y Recursos.
 * @performance Ligero, optimizado para claves de diccionarios en los Almacenes.
 * @contexto Representación unificada de entidades extraíbles.
 */
export enum TipoBloque {
  PIEDRA = "PIEDRA",
  AIRE = "AIRE",
  GEMA = "GEMA",
  COMIDA = "COMIDA",
  AGUA = "AGUA",
  MINERAL = "MINERAL",
  OBJETO = "OBJETO",
  MURO_PIEDRA = "MURO_PIEDRA", //Issue #9
  MADERA = "MADERA",
}

export enum TipoTarea {
  PICAR = "PICAR",
  DEPOSITAR = "DEPOSITAR",
  CONSUMIR = "CONSUMIR",
  CONSTRUIR = "CONSTRUIR",
  RECOLECTAR = "RECOLECTAR",
  RECOGER = "RECOGER",
  TRANSPORTAR = "TRANSPORTAR",
  DECONSTRUIR = "DECONSTRUIR",
  LIMPIAR = "LIMPIAR",
  PULIR = "PULIR",
  COCINAR = "COCINAR",
  CURANDO = "CURANDO",
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
  BUSCAR_RECURSO, //COMER y BEBER Issue #9
  DORMIR, //DESCANSAR Issue #10
}

export enum Profesiones {
  Minero,
  Artesano,
  Militar,
  Armero,
  ForjadorDeArmas,
  Medico,
  Alguacil,
  Posadero,
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
  Critica,
}

/**
 * @description Modelo puro de datos para el estado fisiológico y psíquico.
 * @performance O(1), mantenido intencionalmente plano para ayudar al GC.
 * @contexto Estado de simulación del Modelo MVC.
 */
export interface INecesidades {
  hambre: number;
  sed: number; //por ahora es virtual (hasta que se cree la mecanica)
  descanso: number;
  salud: number;
  vejiga: number;
  higiene: number;
  social: number;
}

//aqui simplificamos mucho codigo...
/**
 * @description Paquete inyectado cada ciclo a las entidades para evitar dependencias circulares.
 * @performance Creado/reutilizado 1 sola vez por Tick en el Controlador.
 * @contexto Cumple Regla #1 (Comunicación por Contexto).
 */
export interface IContextoSimulacion {
  gestor: GestorTareas;
  mapa: Mapa;
  ratio: number;
  tickActual: number;
  almacenes: IAlmacen[]; // Nuevo: Issue #11, Pasamos los almacenes en el contexto
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

//Añadimos un almacen fisico a la colonia
export interface IAlmacen {
  nombre: string;
  posicion: IPosicion3D;
  inventario: Map<TipoBloque, number>;
}
