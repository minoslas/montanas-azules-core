# Contexto del Proyecto: Montañas Azules

- **Arquitectura:** MVC Estricto. El Modelo no conoce al Controlador ni a la Vista.
- **Ecosistema:** Node.js v20+. Uso estricto de `pnpm` (no npm ni yarn).
- **Hardware:** Entorno limitado a 4 GB de RAM. Prohibido sugerir librerías pesadas.
- **Motor:** 3D propio desde cero (WebGL/Vectores). Foco en matemáticas manuales.
- **Entidades:** Basadas en Máquinas de Estados Finitas (FSM).
- **Mapa:** Estructura Sparse Voxel Grid (uso estricto de `Map`) para ahorro de memoria. Limpieza proactiva al minar.
- **Comunicación (Inyección):** Cero variables globales. Las entidades reciben sus dependencias vía `IContextoSimulacion` cada tick.
- **Rendimiento (GC):** Prohibido instanciar objetos anónimos nuevos dentro de bucles críticos como `procesarTick` o `actualizar`.
- **Matemáticas:** Toda operación de distancia o desplazamiento debe delegarse a la clase de utilidad `Vec3`.
- **Documentación:** Todo método crítico debe usar JSDoc incluyendo los tags `@performance` (impacto en memoria/CPU) y `@contexto`.
- **Testeabilidad:** El Modelo completo debe poder ejecutarse y simularse 100% a través de la consola.
