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
const Drac = new Draconiano("d1", "Korg", 0, 1, 0); // Lo ponemos en Y:1 para que pise la superficie
const AlmC = new Almacen("Almacen", 0, 1, 0); // Ponemos el almacen tambien en superficie
const NumD = 5; // Número de draconianos

//Inicializamos el Almacen y añadimos comida al almacen (añado un extra por si acaso)
AlmC.inventario.set(TipoBloque.AGUA,1000);
AlmC.inventario.set(TipoBloque.COMIDA,1000);

//Añadimos tanto a Kong como el Almacen al motor
motor.añadirDraconiano(Drac);
motor.añadirAlmacen(AlmC);

// NUEVO: Korg necesita ayuda. Vamos a reclutar a sus hermanos consumiendo comida, ahora es mas organico.
for(let i = 0; i < NumD; i++) {
    motor.intentarReclutar("Almacen")
}

// 3. Suelo sólido de seguridad
for (let x = 0; x <= 5; x++) {
    for (let z = 0; z <= 5; z++) {
        miMapa.setBloque(x, 0, z, TipoBloque.PIEDRA);
    }
}

// --- DISEÑO DEL ESCENARIO DE PRUEBA (EL MURO) ---

// 1. CREAMOS UNA MONTAÑA EN LA SUPERFICIE (Y:1 y Y:2)
for (let x = 3; x <= 7; x++) {
    for (let y = 1; y <= 2; y++) {
        for (let z = 3; z <= 7; z++) {
            miMapa.setBloque(x, y, z, TipoBloque.PIEDRA);
        }
    }
}

// 2. Construimos una Muralla en forma de "L" en Y=1 que bloquee el camino directo a X=4, Z=4
miMapa.setBloque(2, 1, 1, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(2, 1, 2, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(2, 1, 3, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(3, 1, 3, TipoBloque.MURO_PIEDRA);
miMapa.setBloque(4, 1, 3, TipoBloque.MURO_PIEDRA);

// 3. Ponemos un pozo de agua DETRÁS del muro
miMapa.setBloque(4, 0, 4, TipoBloque.AGUA);

// 4. Le mandamos a Korg ir a por el agua
motor.getGestor().añadirTarea(TipoTarea.RECOLECTAR, { x: 4, y: 0, z: 4 }, PrioridadTarea.Alta);

// 5. ¡TRABAJO REAL! Les mandamos a demoler la montaña que acabamos de crear
LogicaMinera.designarArea(motor.getGestor(), { x: 3, y: 1, z: 3 }, { x: 7, y: 2, z: 7 })

// Mensaje de bienvenida
console.log(`--- 🏔️ Bienvenido a la Cantera, ${Drac.nombre} y compañía ---`);

// Simulamos los 1000 ticks, pero ahora vigilamos a TODA la cuadrilla
for (let i = 0; i < 250; i++) {
    motor.procesarTick();
    
    // Imprimimos un reporte general cada 10 ticks
    if(i % 10 === 0) {
        console.log(`\n--- ⏱️ Tick ${i} ---`);
        motor.getEntidades().forEach(entidad => {
            console.log(`👷 ${entidad.nombre.padEnd(8)} | Estado: ${entidad.estado} | Pos: X=${entidad.posicion.x.toFixed(1)}, Z=${entidad.posicion.z.toFixed(1)} | Mochila: ${entidad.getCargaActual()}/10`);
        });
    }
}

console.log(`--- Final del día ---`);
motor.getEntidades().forEach(entidad => {
    console.log(`👷 ${entidad.nombre.padEnd(8)} | Estado: ${entidad.estado} | Salud: ${entidad.salud.toFixed(1)} | Mochila: ${entidad.getCargaActual()}/10`);
});

// Simulación de Guardado de Partida al terminar
console.log(`--- Guardando partida en disco ---`);
fs.writeFileSync("savegame.json", motor.toJSON(), "utf-8");
console.log(`💾 Partida guardada con éxito. Revisa el archivo 'savegame.json' en la raíz de tu proyecto.`);