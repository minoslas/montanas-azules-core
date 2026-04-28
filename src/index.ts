// src/index.ts (Actualizado)
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";
import { Draconiano } from "./model/entities/Draconiano";

const miMapa = new Mapa();
const motor = new Simulador(miMapa);

// Creamos a nuestro primer habitante
const korg = new Draconiano("d1", "Korg", 0, 0, 0);
motor.añadirDraconiano(korg);

console.log(`--- 🏔️ Bienvenido a la Montaña, ${korg.nombre} ---`);

// Simulamos 200 ticks (Korg empezará a tener hambre tras el tick 160 aprox)
for (let i = 0; i < 200; i++) {
    motor.procesarTick();
}

console.log(`--- Final del día ---`);
console.log(`Estado de ${korg.nombre}: Hambre ${korg.necesidades.hambre}, Salud ${korg.salud}`);