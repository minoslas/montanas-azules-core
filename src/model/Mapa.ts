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
   * @description Devuelve el bloque de esa coordenada. Asume AIRE en superficie (Y>0) y PIEDRA en subsuelo.
   * @performance O(1) lectura de HashMap.
   * @contexto Estructuras Sparse (Regla de Memoria #2).
   */
  public getBloque(x: number, y: number, z: number): TipoBloque {
    const clave = this.generarClave(x, y, z);
    // LA REGLA DEL HORIZONTE: Si estamos por encima de Y=0, el vacío es AIRE. Si no, es PIEDRA.
    const bloquePorDefecto = y > 0 ? TipoBloque.AIRE : TipoBloque.PIEDRA;
    return this.celdas.get(clave) ?? bloquePorDefecto;
  }

  /**
   * @description Reemplaza un Voxel. Borra la clave si coincide con el bloque por defecto para conservar RAM.
   * @performance O(1) en inserción o borrado en el Map principal.
   * @contexto Limpieza Proactiva (GC Friendly - Regla #2).
   */
  public setBloque(x: number, y: number, z: number, tipo: TipoBloque): void {
    const clave = this.generarClave(x, y, z);
    const bloquePorDefecto = y > 0 ? TipoBloque.AIRE : TipoBloque.PIEDRA;

    // Optimización: Solo guardamos en memoria aquello que rompe la regla del horizonte
    if (tipo === bloquePorDefecto) {
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
