// src/index.ts (Actualizado)
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";
import { Draconiano } from "./model/entities/Draconiano";
import { GestorTareas } from "./model/GestorTareas";
import { EstadoIA, TipoTarea, PrioridadTarea } from "./model/Tipos";

const miMapa = new Mapa();
const tarea = new GestorTareas();
const motor = new Simulador(miMapa);

// Creamos a nuestro primer habitante
const korg = new Draconiano("d1", "Korg", 0, 0, 0);
motor.añadirDraconiano(korg);

// Añadimos una orden de picar piedra
motor.getGestor().añadirTarea(TipoTarea.PICAR, { x: 10, y: 0, z: 0 }, PrioridadTarea.Media);

console.log(`--- 🏔️ Bienvenido a la Montaña, ${korg.nombre} ---`);

// Simulamos 200 ticks (Korg empezará a tener hambre tras el tick 160 aprox)
// Simulamos 40 ticks para simular el movimiento
for (let i = 0; i < 40; i++) {
    motor.procesarTick();
    console.log(`Kong está en: X=${korg.posicion.x.toFixed(1)} | Estado: ${EstadoIA[korg.estado]}`);
}

console.log(`--- Final del día ---`);
console.log(`Estado de ${korg.nombre}: Hambre ${korg.necesidades.hambre}, Salud ${korg.salud}`);