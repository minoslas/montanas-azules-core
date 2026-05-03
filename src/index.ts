// src/index.ts (Actualizado)
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";
import { Draconiano } from "./model/entities/Draconiano";
import { LogicaMinera } from "./model/LogicaMinera";
import { Almacen } from "./model/entities/Almacen";

const miMapa = new Mapa();
const motor = new Simulador(miMapa);

// Creamos a nuestro primer habitante
const korg = new Draconiano("d1", "Korg", 0, 0, 0);
const AlmC = new Almacen("Almacen", 0, 0, 0);
motor.añadirDraconiano(korg);
motor.añadirAlmacen(AlmC);

// Añadimos una orden de picar piedra (obsoleta)
//motor.getGestor().añadirTarea(TipoTarea.PICAR, { x: 10, y: 0, z: 0 }, PrioridadTarea.Media);

// Le añadimos un tunel de tres bloques a picar
LogicaMinera.designarArea(motor.getGestor(), {x:1,y:0,z:0}, {x:20,y:0,z:0})

console.log(`--- 🏔️ Bienvenido a la Montaña, ${korg.nombre} ---`);

// Simulamos suficientes ticks para que se pueda completar la tarea (Korg empezará a tener hambre tras el tick 160 aprox)
// Cada bloque tardará 4 Ticks (25 progresos por Tick) + el movimiento (unos 100)
for (let i = 0; i < 400; i++) {
    motor.procesarTick();
    if(i % 5 === 0) {
    console.log(`Tick ${i} | Kong está en: X=${korg.posicion.x.toFixed(1)} | Tarea: ${korg.estado}`);
    }
}

console.log(`--- Final del día ---`);
console.log(`Estado de ${korg.nombre}: Hambre ${korg.necesidades.hambre}, Salud ${korg.salud}`);