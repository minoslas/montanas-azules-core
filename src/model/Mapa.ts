// src/model/Mapa.ts
import { TipoBloque } from "./Tipos";

export class Mapa {
  // El "corazón" de la montaña: solo guardamos lo que NO es piedra sólida
  private celdas: Map<string, TipoBloque>;

  constructor() {
    this.celdas = new Map<string, TipoBloque>();
  }

  /**
   * @description Serializa unas coordenadas numéricas en un String para el Sparse Grid.
   * @performance O(1) interpolación de strings.
   */
  private generarClave(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  /**
   * @description Devuelve el bloque de esa coordenada. Si no existe en el Map, asume PIEDRA sólida.
   * @performance O(1) lectura de HashMap.
   * @contexto Estructuras Sparse (Regla de Memoria #2).
   */
  public getBloque(x: number, y: number, z: number): TipoBloque {
    const clave = this.generarClave(x, y, z);
    return this.celdas.get(clave) ?? TipoBloque.PIEDRA;
  }

  /**
   * @description Reemplaza un Voxel. Borra la clave si es PIEDRA o AIRE para conservar RAM.
   * @performance O(1) en inserción o borrado en el Map principal.
   * @contexto Limpieza Proactiva (GC Friendly - Regla #2).
   */
  public setBloque(x: number, y: number, z: number, tipo: TipoBloque): void {
    const clave = this.generarClave(x, y, z);

    // Optimización (GC Friendly): Si el bloque es AIRE o PIEDRA (el estado por defecto),
    // lo eliminamos del Map para liberar memoria. getBloque() ya asume PIEDRA
    // si la clave no existe, cumpliendo la regla del Sparse Grid.
    if (tipo === TipoBloque.PIEDRA || tipo === TipoBloque.AIRE) {
      this.celdas.delete(clave);
    } else {
      this.celdas.set(clave, tipo);
    }
  }

  /**
   * @description Obtiene la huella actual de almacenamiento del mapa modificado.
   * @performance O(1) accediendo a la propiedad size.
   */
  public obtenerCargaMemoria(): number {
    return this.celdas.size;
  }

  /**
   * @description Serializa el estado actual del Sparse Voxel Grid a una cadena JSON.
   * @performance O(N) donde N es la cantidad de bloques modificados. Crea un array intermedio temporal.
   * @contexto Persistencia y serialización de mundo (Regla #7).
   */
  public toJSON(): string {
    // Convertimos el Map en un array de pares [string, TipoBloque] para poder serializarlo
    const entradas = Array.from(this.celdas.entries());
    return JSON.stringify({ celdas: entradas });
  }

  /**
   * @description Restaura el estado del mapa desde una cadena JSON previamente generada.
   * @param {string} json - Cadena JSON con el estado del mapa.
   * @performance O(N) de reconstrucción. Reutiliza la instancia actual de celdas para ayudar al GC.
   * @contexto Persistencia y serialización de mundo (Regla #7).
   */
  public fromJSON(json: string): void {
    try {
      const datos = JSON.parse(json);
      if (datos && Array.isArray(datos.celdas)) {
        this.celdas.clear(); // Vaciamos sin destruir la instancia
        for (const [clave, tipo] of datos.celdas) {
          this.celdas.set(clave, tipo as TipoBloque);
        }
      }
    } catch (error) {
      console.error("[MAPA-ERROR] Fallo crítico al deserializar el mundo.", error);
    }
  }
}
