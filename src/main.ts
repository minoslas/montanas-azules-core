import { Simulador } from "./controller/Simulador";
import { LogicaMinera } from "./model/LogicaMinera";
import { Mapa } from "./model/Mapa";
import { PrioridadTarea, TipoBloque, TipoTarea } from "./model/Tipos";
import { Almacen } from "./model/entities/Almacen";
import { Draconiano } from "./model/entities/Draconiano";
import { GeneradorTerreno } from "./utils/GeneradorTerreno";
import { MotorGrafico2D } from "./view/MotorGrafico2D";

// --- PALETA DE COLORES DEL ARQUITECTO ---
function obtenerColorVoxel(tipo: TipoBloque): string {
    switch (tipo) {
        case TipoBloque.PIEDRA:       return "#555555"; // Gris oscuro
        case TipoBloque.MURO_PIEDRA:  return "#888888"; // Gris claro
        case TipoBloque.AGUA:         return "#3388FF"; // Azul agua
        case TipoBloque.MADERA:       return "#8B5A2B"; // Marrón
        case TipoBloque.COMIDA:       return "#FF4500"; // Naranja-Rojo
        default:                      return "#FF00FF"; // Magenta chillón (para detectar errores)
    }
}

console.log("--- 🏔️ Iniciando Bucle de Juego de Montañas Azules ---");

const motorGrafico = new MotorGrafico2D("lienzoJuego");
const mapaJuego = new Mapa();
const simulador = new Simulador(mapaJuego);

// --- 1. CONFIGURACIÓN DEL ESCENARIO ---

// ¡MAGIA PROCEDURAL! (Reducida a 50x50x5 para que el Canvas 2D fluya a 60 FPS)
GeneradorTerreno.generarMontaña(mapaJuego, 50, 50, 5);

const Korg = new Draconiano("d1", "Korg", 1, 1, 1);
const NumD = 10; // Número de draconianos extra a reclutar

// Movemos el Almacén a la posición (1, 1) para que no se pegue al borde y lo veamos bien
const AlmC = new Almacen("Almacen", 1, 1, 1);

// Inicializamos el almacen y añadimos comida y agua por si las moscas.
AlmC.inventario.set(TipoBloque.AGUA, 1000);
AlmC.inventario.set(TipoBloque.COMIDA, 1000);

simulador.añadirDraconiano(Korg);
simulador.añadirAlmacen(AlmC);

// Reclutamiento orgánico de la cuadrilla
for(let i = 0; i < NumD; i++) {
    simulador.intentarReclutar("Almacen");
}

// CREAMOS LA VETA MINERA (Y:1 y Y:2)
for (let x = 6; x <= 11; x++) {
    for (let y = 1; y <= 2; y++) {
        for (let z = 4; z <= 9; z++) {
            mapaJuego.setBloque(x, y, z, TipoBloque.PIEDRA);
        }
    }
}

// Construimos el muro en L (Piso 1)
mapaJuego.setBloque(4, 1, 1, TipoBloque.MURO_PIEDRA);
mapaJuego.setBloque(4, 1, 2, TipoBloque.MURO_PIEDRA);
mapaJuego.setBloque(4, 1, 3, TipoBloque.MURO_PIEDRA);
mapaJuego.setBloque(5, 1, 3, TipoBloque.MURO_PIEDRA);
mapaJuego.setBloque(6, 1, 3, TipoBloque.MURO_PIEDRA);

// EL ARREGLO: Ponemos el agua en el Piso 1, al mismo nivel que Korg
mapaJuego.setBloque(8, 1, 5, TipoBloque.AGUA);

// ASIGNACIÓN DE TAREAS AL GESTOR
// 1. Tarea de agua
simulador.getGestor().añadirTarea(TipoTarea.RECOLECTAR, { x: 4, y: 1, z: 4 }, PrioridadTarea.Alta);

// 2. ¡TRABAJO REAL! Tarea de demolición masiva
LogicaMinera.designarArea(simulador.getGestor(), { x: 6, y: 1, z: 4 }, { x: 15, y: 2, z: 12 });

// --- 2. EL GAME LOOP ---
let ultimoTiempo = 0;
const TICK_RATE = 1000 / 10; 
let tiempoAcumulado = 0;

function gameLoop(tiempoActual: number) {
    const deltaTime = tiempoActual - ultimoTiempo;
    ultimoTiempo = tiempoActual;
    tiempoAcumulado += deltaTime;

    // ACTUALIZAR LÓGICA (10 Ticks por segundo)
    while (tiempoAcumulado >= TICK_RATE) {
        simulador.procesarTick(); 
        tiempoAcumulado -= TICK_RATE;

        // ¡ACTUALIZAMOS LA INTERFAZ CON LOS DATOS REALES!
        actualizarUI();
    }

    // RENDERIZAR VISTA
    motorGrafico.limpiarPantalla();
    
    // EXTRACCIÓN DE DATOS: Mapeamos la (X, Z) del modelo 3D a la (X, Y) de la pantalla 2D
    const bloques3D = mapaJuego.obtenerTodosLosBloquesValidos();
    const posicionesPiedra = bloques3D.map(b => ({
        x: b.x, y: b.z,
        color: obtenerColorVoxel(b.tipo)
        })); // <-- Conversión Z a Y aquí
    
    // Identificamos dinámicamente quién es el último draconiano creado
    const entidades = simulador.getEntidades();
    const idUltimo = entidades.length > 0 ? entidades[entidades.length - 1].id : "";

    const posicionesDraconianos = entidades.map(e => {
        let colorDraconiano = "#44ff44"; // Verde normal
        if (e.id === "d1") colorDraconiano = "#00FFFF"; // Korg
        else if (e.id === idUltimo) colorDraconiano = "#FF00FF"; // El último de la fila (Magenta)

        return { 
            x: e.posicion.x, 
            y: e.posicion.z,
            color: colorDraconiano
        };
    });

    const posicionesAlmacenes = [{ x: AlmC.posicion.x, y: AlmC.posicion.z }];

    // DIBUJAR
    motorGrafico.dibujarMapa(posicionesPiedra);
    motorGrafico.dibujarAlmacenes(posicionesAlmacenes);
    motorGrafico.dibujarEntidades(posicionesDraconianos);

    requestAnimationFrame(gameLoop);
}

// Iniciar el latido
requestAnimationFrame(gameLoop);

// --- CONTROLES DE DEPURACIÓN ---
window.addEventListener("keydown", (evento) => {
    if (evento.key.toLowerCase() === "r") {
        console.log("🔄 Reiniciando simulación...");
        // La forma más bruta y efectiva en esta fase del desarrollo: recargar la pestaña
        window.location.reload(); 
    }
});

// ==========================================
// INTERFAZ DE USUARIO (UI)
// ==========================================
const uiPoblacion = document.getElementById("ui-poblacion");
const uiAgua = document.getElementById("ui-agua");
const uiComida = document.getElementById("ui-comida");
const uiPiedra = document.getElementById("ui-piedra");
const uiMuro = document.getElementById("ui-muro");

const uiLog = document.getElementById("ui-log");

function actualizarUI() {
    // 1. Actualizar Población
    if (uiPoblacion) {
        uiPoblacion.innerText = simulador.getEntidades().length.toString();
    }
    
    // 2. Actualizar Recursos del Almacén Principal (AlmC)
    if (uiAgua) uiAgua.innerText = (AlmC.inventario.get(TipoBloque.AGUA) || 0).toString();
    if (uiComida) uiComida.innerText = (AlmC.inventario.get(TipoBloque.COMIDA) || 0).toString();
    if (uiPiedra) uiPiedra.innerText = (AlmC.inventario.get(TipoBloque.PIEDRA) || 0).toString();
}