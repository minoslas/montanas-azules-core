import { MotorGrafico2D } from "./view/MotorGrafico2D";

console.log("🏔️ Iniciando Vista de Montañas Azules");

const motor = new MotorGrafico2D("lienzoJuego");

motor.limpiarPantalla();
motor.dibujarCuadradoPrueba(100, 100, 32, "#888888"); // Piedra
motor.dibujarCuadradoPrueba(150, 100, 16, "#44ff44"); // Korg