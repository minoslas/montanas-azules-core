# 📜 Guía de Estilo: Proyecto "Montañas Azules"

## 1. Filosofía de Arquitectura (MVC Estricto)
*   **Independencia Total del Modelo**: El `Modelo` (entidades, mapa, recursos) nunca debe importar componentes del `Controlador` o la `Vista`. Debe ser ejecutable y testeable íntegramente por consola[cite: 2].
*   **Comunicación por Contexto**: Las entidades no deben poseer referencias globales al simulador o al mapa. En cada tick, deben recibir un objeto `IContextoSimulacion` que contenga las herramientas necesarias (gestor de tareas, mapa, ratio de tiempo)[cite: 2, 7].
*   **Propiedad Única**: Solo el `Simulador` es responsable de avanzar el `tickActual` y orquestar la actualización de las entidades[cite: 1, 7].

## 2. Gestión Crítica de Memoria (Restricción 4GB RAM)
*   **Estructuras de Datos Sparse**: Prohibido el uso de arrays densos para representar el espacio 3D. Se utilizará siempre un `Map<string, T>` (Sparse Voxel Grid) donde la clave sea una coordenada stringizada ("x,y,z") para almacenar solo bloques que no sean piedra base o aire[cite: 4, 5].
*   **Limpieza Proactiva (GC Friendly)**: 
    *   Las tareas completadas deben eliminarse de la cola mediante `splice` o `delete` inmediatamente[cite: 3, 4].
    *   Si un bloque se convierte en `AIRE` o vuelve a ser `PIEDRA` base, debe ser eliminado del `Map` del mapa para liberar RAM[cite: 4, 5].
*   **Evitar Instanciación en Bucle**: En el método `procesarTick`, se debe evitar crear objetos anónimos nuevos. Reutilizar interfaces o estructuras existentes para no saturar el Recolector de Basura (GC)[cite: 2, 7].

## 3. Estándares de TypeScript y Código
*   **Tipado Riguroso**: Prohibido el uso de `any`. Todo dato debe estar definido por una `interface` (para datos puros) o una `class` (para lógica y estado) en `Tipos.ts`[cite: 5, 6].
*   **Interfaces sobre Clases**: Priorizar el uso de interfaces para la definición de estados (`ITarea`, `IPosicion3D`, `INecesidades`) para mantener la ligereza del objeto en memoria[cite: 5, 6].
*   **Matemáticas Vectoriales**: 
    *   Prohibido recalcular distancias euclidianas manualmente en los métodos de las entidades.
    *   Toda operación espacial debe delegarse a la clase de utilidad `Vec3` para asegurar que los ejes X, Y y Z se procesen correctamente y evitar errores de brújula[cite: 7].

## 4. Documentación para IA (JSDoc)
Para facilitar la asistencia de **Gemini Code Assist**, cada clase y método crítico debe incluir metadatos de comportamiento:
```typescript
/**
 * @description Breve explicación de la lógica.
 * @param {Tipo} nombre - Uso del parámetro.
 * @performance Impacto estimado en memoria/CPU (ej. O(1), O(n)).
 * @contexto Requisito de Issue #[Número].
 */
```

## 5. Rendimiento de Consola y Logs (I/O)
*   **Evitar Spam de I/O**: Las llamadas a `console.log` bloquean el hilo principal. Solo deben dispararse ante cambios de estado concretos, o deben limitarse usando el contexto del tiempo (ej. `if (ctx.tickActual % 10 === 0)`).

## 6. Constantes y Balanceo (Magic Numbers)
*   **Cero Números Mágicos**: Queda prohibido el uso de números hardcodeados (ej. `this.hambre += 0.1`) en la lógica si representan reglas de balanceo. Deben estar bien identificados o documentados para facilitar su posterior extracción a sistemas de configuración.

## 7. Persistencia y Serialización (Guardado en JSON)
*   **Serialización de Estructuras Map**: Los objetos `Map` (como el Sparse Voxel Grid de `Mapa` o los inventarios) no son serializables por defecto en JSON. Deben transformarse explícitamente a arrays de pares `[clave, valor]` o a objetos literales antes de usar `JSON.stringify`, y viceversa al usar `JSON.parse`.
*   **Guardado Asíncrono (GC Friendly)**: Si el mundo crece sustancialmente, las operaciones de guardado deben ser progresivas o manejar eficientemente la cadena de texto para evitar duplicar el uso de memoria en un único "pico" que sature la restricción de los 4GB de RAM.