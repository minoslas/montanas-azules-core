// src/index.ts (Actualizado)
import { Mapa } from "./model/Mapa";
import { Simulador } from "./controller/Simulador";
import { Draconiano } from "./model/entities/Draconiano";
import { LogicaMinera } from "./model/LogicaMinera";
import { Almacen } from "./model/entities/Almacen";
import { TipoBloque, TipoTarea, PrioridadTarea} from "./model/Tipos";

const miMapa = new Mapa();
const motor = new Simulador(miMapa);

// Creamos a nuestro primer habitante
const korg = new Draconiano("d1", "Korg", 0, 0, 0);
const AlmC = new Almacen("Almacen", 0, 0, 0);
//Eliminamos el agua del Almacen
//AlmC.inventario.set(TipoBloque.AGUA,100);
AlmC.inventario.set(TipoBloque.COMIDA,100);
motor.añadirDraconiano(korg);
motor.añadirAlmacen(AlmC);

// Modificicadores temporales para pruebas
// korg.necesidades.descanso = 80; //Para probar descanso

// --- DISEÑO DEL ENTORNO (El Pozo) ---
// Como bien dijiste, el agua no puede estar a nivel de suelo sin derramarse. 
// La ponemos en Y: -1 (bajo tierra).
miMapa.setBloque(5, -1, 0, TipoBloque.AGUA);
miMapa.setBloque(6, -1, 0, TipoBloque.AGUA);

// Le asignamos a Korg ir a recoger ese agua
motor.getGestor().añadirTarea(TipoTarea.RECOLECTAR, { x: 5, y: -1, z: 0 }, PrioridadTarea.Alta);
motor.getGestor().añadirTarea(TipoTarea.RECOLECTAR, { x: 6, y: -1, z: 0 }, PrioridadTarea.Alta);

// Le añadimos un tunel de tres bloques a picar
LogicaMinera.designarArea(motor.getGestor(), {x:1,y:0,z:0}, {x:60,y:0,z:0})

// Añadimos una tarea de CONSTRUCCIÓN
motor.getGestor().añadirTarea(TipoTarea.CONSTRUIR, { x: 5, y: 1, z: 0 }, PrioridadTarea.Alta);

// Mensaje de bienvenida
console.log(`--- 🏔️ Bienvenido a la Montaña, ${korg.nombre} ---`);

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