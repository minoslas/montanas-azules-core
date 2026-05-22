// src/utils/GeneradorTerreno.ts
import { Mapa } from "../model/Mapa";
import { TipoBloque } from "../model/Tipos";

export class GeneradorTerreno {
    /**
     * @description Genera un volumen de terreno procedural inyectándolo en el mapa proporcionado.
     * @param {Mapa} mapa - La instancia del mapa a poblar.
     * @param {number} anchoX - Tamaño en el eje X.
     * @param {number} profundoZ - Tamaño en el eje Z.
     * @param {number} altoY - Cuántos bloques hacia abajo (subterráneos) se generarán.
     * @performance O(X*Y*Z). Utiliza console.time para auditar CPU. Optimizada para Sparse Voxel Grid.
     * @contexto Generación de mundo base (Issue #12).
     */
    public static generarMontaña(mapa: Mapa, anchoX: number, profundoZ: number, altoY: number): void {
        console.time("[MUNDO] Tiempo de generación");
        let bloquesGenerados = 0;
        let vetasAgua = 0;

        // Bucle tridimensional (X, Z para la superficie; Y negativo para la profundidad)
        for (let x = 0; x < anchoX; x++) {
            for (let z = 0; z < profundoZ; z++) {
                for (let y = 0; y >= -altoY; y--) {
                    
                    // Lógica Procedural Básica (Ruido Blanco controlado)
                    // Damos un 2% de probabilidad de que el bloque sea un manantial de agua si está bajo tierra
                    const esAgua = (y < 0) && (Math.random() < 0.02);

                    if (esAgua) {
                        mapa.setBloque(x, y, z, TipoBloque.AGUA);
                        vetasAgua++;
                    }
                    // REGLA #4 (.gemini): No guardamos PIEDRA en memoria si Y <= 0.
                    // El objeto Mapa debe inferir que todo lo no registrado en Y <= 0 es PIEDRA.
                    
                    bloquesGenerados++;
                }
            }
        }

        console.timeEnd("[MUNDO] Tiempo de generación");
        console.log(`[MUNDO] Generación completada. Volumen total: ${bloquesGenerados} bloques. Vetas de agua: ${vetasAgua}.`);
    }
}