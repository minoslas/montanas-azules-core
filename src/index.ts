// src/index.ts
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";

// Inicializamos el Modelo
const miMontaña = new Mapa();

// Inicializamos el Controlador pasando el Modelo
const motor = new Simulador(miMontaña);

console.log("--- 🏔️ Iniciando Ciclo de Vida de la Montaña ---");

// Simulamos una secuencia de 50 ticks
for (let i = 0; i < 50; i++) {
    // Simulamos una pausa a mitad del proceso solo para testear
    if (i === 25) motor.togglePausa();
    if (i === 35) motor.togglePausa();

    motor.procesarTick();
}

console.log(`--- ✅ Simulación finalizada en el tick: ${motor.getTickActual()} ---`);