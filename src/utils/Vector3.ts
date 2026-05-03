import { IPosicion3D, TipoBloque } from "../model/Tipos";

export class Vec3 {
    static distancia(a: IPosicion3D, b: IPosicion3D): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    static hacia(desde: IPosicion3D, hacia: IPosicion3D, velocidad: number): IPosicion3D {
        const d = this.distancia(desde, hacia);
        if (d < 0.1) return hacia;
        return {
            x: desde.x + ((hacia.x - desde.x) / d) * velocidad,
            y: desde.y + ((hacia.y - desde.y) / d) * velocidad,
            z: desde.z + ((hacia.z - desde.z) / d) * velocidad
        };
    }
}