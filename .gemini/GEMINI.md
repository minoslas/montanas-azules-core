# Contexto del Proyecto: Montañas Azules

Eres un asistente de IA trabajando en "Montañas Azules", un motor de simulación y gestión de colonias Voxel.

## Reglas Arquitectónicas Estrictas (¡INQUEBRANTABLES!)
1. **Patrón MVC Puro:** El Modelo (`src/model/`) no puede tener NINGUNA dependencia de la Vista ni del navegador (ni `window`, ni `document`, ni librerías gráficas). Es matemática y lógica pura.
2. **Motor WebGL Custom:** La Vista (`src/view/`) usará WebGL 2.0 nativo. **PROHIBIDO sugerir Three.js**, Babylon.js o similares. El objetivo es minimizar el uso de RAM.
3. **Manejo de Memoria:** Usamos un "Sparse Voxel Grid" (Mapas Hash) en `Mapa.ts` y estructuras TypedArrays (`Uint8Array`, `Float32Array`) para evitar colapsar el Garbage Collector.
4. **Regla del Horizonte (Físicas):** Todo lo que está por encima de `Y=0` es `AIRE` por defecto. Todo lo que está de `Y=0` hacia abajo es `PIEDRA` por defecto. No guardamos el vacío en memoria.
5. **Lenguaje:** TypeScript estricto. Usa tipado fuerte e interfaces formales. No uses `any`.

## Estilo de Código
- Documentación mediante JSDoc obligatoria en métodos públicos (incluye @performance y @contexto).
- Preferencia por rendimiento (O(1) o O(n log n)) frente a código más corto pero costoso.