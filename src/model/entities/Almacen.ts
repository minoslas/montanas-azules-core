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

    public extraerRecurso(tipo: TipoBloque, cantidad: number): boolean {
        const stock = this.inventario.get(tipo) || 0;
        if(stock >= cantidad) {
            this.inventario.set(tipo, stock - cantidad);
            return true;
        }
        return false;
    }
}