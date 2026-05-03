import { IPosicion3D, TipoBloque } from "../Tipos";


export class Almacen {
    public inventario: Map<TipoBloque, number> = new Map(); 
    public posicion: IPosicion3D;
    public nombre: string;

    constructor (nombre: string, x: number, y: number, z: number){
        this.nombre = nombre;
        this.posicion = {x,y,z};
    }

    public depositar(tipo: TipoBloque, cantidad: number): void {
        const actual = this.inventario.get(tipo) || 0;
        this.inventario.set(tipo, actual + cantidad);
        console.log(`[ALMACÉN] ${this.nombre} ahora tiene ${actual + cantidad} de ${TipoBloque[tipo]}`);
    }
}