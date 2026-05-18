// src/utils/Pathfinder.ts
import { Mapa } from "../model/Mapa";
import { IPosicion3D, TipoBloque } from "../model/Tipos";
import { Vec3 } from "./Vector3";

class Nodo {
    public g: number = 0; // Costo desde el inicio
    public h: number = 0; // Heurística (distancia estimada al final)
    public f: number = 0; // g + h
    public padre: Nodo | null = null;

    constructor(public x: number, public y: number, public z: number) {}
    public get id(): string { return `${this.x},${this.y},${this.z}`; }
}

export class Pathfinder {
    /**
     * @description Encuentra el camino más corto esquivando obstáculos y respetando desniveles (1 bloque de altura).
     * @performance O(N log N) con límite de iteraciones.
     * @contexto IA de Navegación (Issue #14).
     */
    public static encontrarRuta(mapa: Mapa, inicio: IPosicion3D, destino: IPosicion3D): IPosicion3D[] | null {
        const abiertas: Nodo[] = [];
        const cerradas: Set<string> = new Set();
        
        const nodoInicio = new Nodo(Math.round(inicio.x), Math.round(inicio.y), Math.round(inicio.z));
        abiertas.push(nodoInicio);

        let iteraciones = 0;
        const MAX_ITERACIONES = 500; // Evita bloqueos de CPU si no hay salida

        // Direcciones cardinales (N, S, E, W)
        const dirs = [ {x:1, z:0}, {x:-1, z:0}, {x:0, z:1}, {x:0, z:-1} ];

        while (abiertas.length > 0 && iteraciones < MAX_ITERACIONES) {
            iteraciones++;

            // Extraer el nodo con menor costo F
            abiertas.sort((a, b) => a.f - b.f);
            const actual = abiertas.shift()!;
            cerradas.add(actual.id);

            // CONDICIÓN DE ÉXITO: Estamos a 1 bloque de distancia del objetivo (alcance del pico)
            const distAlObjetivo = Vec3.distanciaCuadrada(actual, destino);
            if (distAlObjetivo <= 2.25) { // 1.5 al cuadrado = 2.25
                const ruta: IPosicion3D[] = [];
                let curr: Nodo | null = actual;
                while (curr !== null) {
                    ruta.unshift({ x: curr.x, y: curr.y, z: curr.z });
                    curr = curr.padre;
                }
                return ruta; // Devolvemos la ruta trazada
            }

            // Explorar vecinos
            for (const dir of dirs) {
                const nx = actual.x + dir.x;
                const nz = actual.z + dir.z;

                // Verificamos alturas posibles (mismo nivel, bajar 1, o subir 1 escalón)
                for (const dy of [0, -1, 1]) {
                    const ny = actual.y + dy;
                    const idVecino = `${nx},${ny},${nz}`;

                    if (cerradas.has(idVecino)) continue;

                    // Reglas Físicas de Navegación:
                    // 1. El destino debe ser atravesable (Aire o Agua)
                    const bloqueDestino = mapa.getBloque(nx, ny, nz);
                    if (bloqueDestino !== TipoBloque.AIRE && bloqueDestino !== TipoBloque.AGUA) continue;

                    // 2. Debe haber un suelo sólido debajo (Piedra o Muro), o caeremos al vacío
                    const bloqueSuelo = mapa.getBloque(nx, ny - 1, nz);
                    if (bloqueSuelo === TipoBloque.AIRE || bloqueSuelo === TipoBloque.AGUA) continue;

                    // Si pasa las físicas, calculamos costes
                    const vecino = new Nodo(nx, ny, nz);
                    vecino.padre = actual;
                    vecino.g = actual.g + 1 + (dy !== 0 ? 0.5 : 0); // Penalizamos un poco los saltos
                    vecino.h = Math.abs(nx - destino.x) + Math.abs(ny - destino.y) + Math.abs(nz - destino.z); // Distancia Manhattan
                    vecino.f = vecino.g + vecino.h;

                    // Comprobar si ya está en abiertas con mejor coste
                    const enAbiertas = abiertas.find(n => n.id === vecino.id);
                    if (enAbiertas && enAbiertas.g <= vecino.g) continue;

                    abiertas.push(vecino);
                }
            }
        }

        console.log(`[PATHFINDER] Ruta no encontrada o demasiado compleja tras ${iteraciones} iteraciones.`);
        return null;
    }
}