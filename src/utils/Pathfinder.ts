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
    // FIX GC: Constantes estáticas para evitar instanciar arrays en cada llamada (Regla #2)
    private static readonly DIRS = [ {x:1, z:0}, {x:-1, z:0}, {x:0, z:1}, {x:0, z:-1} ];
    private static readonly SALTOS_Y = [0, -1, 1];

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
        const MAX_ITERACIONES = 5000; // FIX: Altísima resiliencia para encontrar caminos muy largos o alternativos

        while (abiertas.length > 0 && iteraciones < MAX_ITERACIONES) {
            iteraciones++;

            // Extraer el nodo con menor costo F
            abiertas.sort((a, b) => a.f - b.f);
            const actual = abiertas.shift()!;
            cerradas.add(actual.id);

            // CONDICIÓN DE ÉXITO: Estamos a alcance del pico (DISTANCIA_INTERACCION = 1.9 -> ^2 = 3.61)
            const distAlObjetivo = Vec3.distanciaCuadrada(actual, destino);
            if (distAlObjetivo <= 3.61) { 
                const ruta: IPosicion3D[] = [];
                let curr: Nodo | null = actual;
                while (curr !== null) {
                    ruta.unshift({ x: curr.x, y: curr.y, z: curr.z });
                    curr = curr.padre;
                }
                return ruta; // Devolvemos la ruta trazada
            }

            // Explorar vecinos
            for (const dir of Pathfinder.DIRS) {
                const nx = actual.x + dir.x;
                const nz = actual.z + dir.z;

                // Verificamos alturas posibles (mismo nivel, bajar 1, o subir 1 escalón)
                for (const dy of Pathfinder.SALTOS_Y) {
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

                    // 3. REGLAS ANTI-CLIPPING (Fantasmas atravesando materia)
                    if (dy === 1) {
                        // Si saltamos hacia ARRIBA: No podemos tener un techo sólido sobre la cabeza
                        const bloqueTecho = mapa.getBloque(actual.x, actual.y + 1, actual.z);
                        if (bloqueTecho !== TipoBloque.AIRE && bloqueTecho !== TipoBloque.AGUA) continue;

                        // REGLA DE VERTICALIDAD ESTRICTA (Preparación para Subsuelo): 
                        // Prohibimos escalar bloques a mano descubierta. Muros y piedra son 100% impasables.
                        // (En un futuro, aquí validaremos: si no hay un TipoBloque.ESCALERA, continue;)
                        continue; 
                    } 
                    else if (dy === -1) {
                        // Si saltamos hacia ABAJO: El bloque frente a nosotros debe estar vacío (No cortar esquinas)
                        const bloqueFrente = mapa.getBloque(nx, actual.y, nz);
                        if (bloqueFrente !== TipoBloque.AIRE && bloqueFrente !== TipoBloque.AGUA) continue;
                    }

                    // Coste dinámico: Nadar o vadear por el agua cansa 5 veces más que caminar
                    const costeTerreno = (bloqueDestino === TipoBloque.AGUA) ? 5 : 1;

                    const vecino = new Nodo(nx, ny, nz);
                    vecino.padre = actual;
                    vecino.g = actual.g + costeTerreno + (dy !== 0 ? 15 : 0); // Fuerte penalización a saltar muros para forzar rodeos
                    vecino.h = Math.abs(nx - destino.x) + (Math.abs(ny - destino.y) * 15) + Math.abs(nz - destino.z); 
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