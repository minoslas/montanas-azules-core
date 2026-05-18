// src/index.ts (Actualizado)
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";
import { Draconiano } from "./model/entities/Draconiano";
import { LogicaMinera } from "./model/LogicaMinera";
import { Almacen } from "./model/entities/Almacen";
import { TipoBloque, TipoTarea, PrioridadTarea} from "./model/Tipos";
import { GeneradorTerreno } from "./utils/GeneradorTerreno";
import * as fs from "fs";

const miMapa = new Mapa();

// ¡MAGIA PROCEDURAL! Generamos una montaña de 100x100x20 (200,000 bloques)
GeneradorTerreno.generarMontaña(miMapa, 100, 100, 20);

const motor = new Simulador(miMapa);

// Creamos a nuestro primer habitante
const korg = new Draconiano("d1", "Korg", 0, 1, 0); // Lo ponemos en Y:1 para que pise la superficie
const AlmC = new Almacen("Almacen", 0, 1, 0); // Ponemos el almacen tambien en superficie

//Eliminamos el agua del Almacen y añadimos comida al almacen
AlmC.inventario.set(TipoBloque.AGUA,100);
AlmC.inventario.set(TipoBloque.COMIDA,100);

//Añadimos tanto a Kong como el Almacen al motor
motor.añadirDraconiano(korg);
motor.añadirAlmacen(AlmC);

// Modificicadores temporales para pruebas
// korg.necesidades.descanso = 80; //Para probar descanso

// --- DISEÑO DEL ESCENARIO DE PRUEBA (EL MURO) ---

// 1. Ponemos suelo sólido para que Korg no se caiga al vacío (Físicas Issue #13)
for (let x = 0; x <= 5; x++) {
    for (let z = 0; z <= 5; z++) {
        miMapa.setBloque(x, 0, z, TipoBloque.PIEDRA);
    }
}

// 2. Construimos una Muralla en forma de "L" en Y=1 que bloquee el camino directo a X=4, Z=4
miMapa.setBloque(2, 1, 1, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(2, 1, 2, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(2, 1, 3, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(3, 1, 3, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(4, 1, 3, TipoBloque.MURO_PIEDRA);

// 3. Ponemos un pozo de agua DETRÁS del muro
miMapa.setBloque(4, 1, 4, TipoBloque.AGUA);

// 4. Le mandamos a Korg ir a por el agua
motor.getGestor().añadirTarea(TipoTarea.RECOLECTAR, { x: 4, y: 1, z: 4 }, PrioridadTarea.Alta);

// 5. Le damos trabajo extra para que no se quede de brazos cruzados tras coger el agua (Prioridad Media)
LogicaMinera.designarArea(motor.getGestor(), { x: 5, y: 1, z: 5 }, { x: 7, y: 1, z: 7 });

// Mensaje de bienvenida
console.log(`--- 🏔️ Bienvenido a la Montaña de 200k, ${korg.nombre} ---`);

// Simulamos suficientes ticks para que se pueda completar la tarea (Korg empezará a tener hambre tras el tick 160 aprox)
// Cada bloque tardará 4 Ticks (25 progresos por Tick) + el movimiento (unos 100)
for (let i = 0; i < 1000; i++) {
    motor.procesarTick();
    if(i % 5 === 0) {
    console.log(`Tick ${i} | Korg está en: X=${korg.posicion.x.toFixed(1)} | Tarea: ${korg.estado}`);
    }
}

console.log(`--- Final del día ---`);
console.log(`Estado de ${korg.nombre}: Hambre ${korg.necesidades.hambre}, Sed ${korg.necesidades.sed}, Salud ${korg.salud}`);

// Simulación de Guardado de Partida al terminar
console.log(`--- Guardando partida en disco ---`);
fs.writeFileSync("savegame.json", motor.toJSON(), "utf-8");
console.log(`💾 Partida guardada con éxito. Revisa el archivo 'savegame.json' en la raíz de tu proyecto.`);