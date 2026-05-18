import { IPosicion3D, TipoBloque } from "../Tipos";

export class Almacen {
    public inventario: Map<TipoBloque, number> = new Map(); 
    public posicion: IPosicion3D;
    public nombre: string;

    constructor (nombre: string, x: number, y: number, z: number){
        this.nombre = nombre;
        this.posicion = {x,y,z};
    }

    /**
     * @description Añade unidades de un recurso de forma aditiva.
     * @param {TipoBloque} tipo - El material ingresado.
     * @performance O(1) acceso de mapa.
     */
    public depositar(tipo: TipoBloque, cantidad: number): void {
        const actual = this.inventario.get(tipo) || 0;
        this.inventario.set(tipo, actual + cantidad);
        console.log(`[ALMACÉN] ${this.nombre} ahora tiene ${actual + cantidad} de ${TipoBloque[tipo]}`);
    }

    /**
     * @description Intenta consumir stock. Retorna falso si no hay recursos suficientes.
     * @param {TipoBloque} tipo - Recurso demandado.
     * @param {number} cantidad - Unidades solicitadas.
     * @performance O(1) acceso de mapa.
     */
    public extraerRecurso(tipo: TipoBloque, cantidad: number): boolean {
        const stock = this.inventario.get(tipo) || 0;
        if(stock >= cantidad) {
            this.inventario.set(tipo, stock - cantidad);
            return true;
        }
        return false;
    }

    /**
     * @description Serializa el inventario y estado del almacén a JSON.
     * @performance O(I) donde I son los tipos de items almacenados.
     * @contexto Persistencia y guardado de partidas (Regla #7).
     */
    public toJSON(): string {
        return JSON.stringify({
            nombre: this.nombre,
            posicion: this.posicion,
            inventario: Array.from(this.inventario.entries())
        });
    }

    /**
     * @description Restaura el estado del almacén desde JSON.
     * @param {string} json - JSON string.
     * @performance O(I) para restaurar el inventario. Amigable con GC.
     * @contexto Carga de partidas (Regla #7).
     */
    public fromJSON(json: string): void {
        const datos = JSON.parse(json);
        if (datos.nombre) this.nombre = datos.nombre;
        if (datos.posicion) this.posicion = datos.posicion;
        if (datos.inventario && Array.isArray(datos.inventario)) {
            this.inventario.clear(); // Reutilizar el Map existente
            for (const [tipo, cantidad] of datos.inventario) {
                this.inventario.set(tipo as TipoBloque, cantidad);
            }
        }
    }
}