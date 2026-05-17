// src/index.ts (Actualizado)
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";
import { Draconiano } from "./model/entities/Draconiano";
import { LogicaMinera } from "./model/LogicaMinera";
import { Almacen } from "./model/entities/Almacen";
import { TipoBloque, TipoTarea, PrioridadTarea} from "./model/Tipos";
import { GeneradorTerreno } from "./utils/GeneradorTerreno";

const miMapa = new Mapa();

// ¡MAGIA PROCEDURAL! Generamos una montaña de 100x100x20 (200,000 bloques)
GeneradorTerreno.generarMontaña(miMapa, 100, 100, 20);

const motor = new Simulador(miMapa);

// Creamos a nuestro primer habitante
const korg = new Draconiano("d1", "Korg", 0, 1, 0); // Lo ponemos en Y:1 para que pise la superficie
const AlmC = new Almacen("Almacen", 0, 1, 0); // Ponemos el almacen tambien en superficie

//Eliminamos el agua del Almacen y añadimos comida al almacen
//AlmC.inventario.set(TipoBloque.AGUA,100);
AlmC.inventario.set(TipoBloque.COMIDA,100);

//Añadimos tanto a Kong como el Almacen al motor
motor.añadirDraconiano(korg);
motor.añadirAlmacen(AlmC);

// Modificicadores temporales para pruebas
// korg.necesidades.descanso = 80; //Para probar descanso

// Designamos un área gigante para que Korg tenga trabajo para toda su vida
LogicaMinera.designarArea(motor.getGestor(), {x:0, y:0, z:0}, {x:10, y:-5, z:10});

// Vamos a trampear un poco para las pruebas: 
// Como el agua ahora es aleatoria, le aseguramos un pozo al lado del almacén para que no muera en los primeros ticks mientras prueba.
miMapa.setBloque(2, 1, 0, TipoBloque.AGUA);
motor.getGestor().añadirTarea(TipoTarea.RECOLECTAR, { x: 2, y: 1, z: 0 }, PrioridadTarea.Alta);

// Le añadimos un tunel de tres bloques a picar
LogicaMinera.designarArea(motor.getGestor(), {x:1,y:0,z:0}, {x:60,y:0,z:0})

// Añadimos una tarea de CONSTRUCCIÓN
motor.getGestor().añadirTarea(TipoTarea.CONSTRUIR, { x: 5, y: 1, z: 0 }, PrioridadTarea.Alta);

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