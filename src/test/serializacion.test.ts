
import { Mapa } from "../model/Mapa";
import { TipoBloque } from "../model/Tipos";
import { Draconiano } from "../model/entities/Draconiano";

function ejecutarTests() {
    console.log("=== INICIANDO TESTS DE SERIALIZACIÓN ===");

    // --- TEST 1: MAPA (Sparse Voxel Grid) ---
    const mapa = new Mapa();
    mapa.setBloque(1, 1, 1, TipoBloque.AGUA);
    mapa.setBloque(2, 2, 2, TipoBloque.MURO_PIEDRA);

    const mapaJSON = mapa.toJSON();
    const mapaRestaurado = new Mapa();
    mapaRestaurado.fromJSON(mapaJSON);

    const bloque1 = mapaRestaurado.getBloque(1, 1, 1);
    const bloque2 = mapaRestaurado.getBloque(2, 2, 2);

    if (bloque1 === TipoBloque.AGUA && bloque2 === TipoBloque.MURO_PIEDRA) {
        console.log("✅ TEST MAPA: Serialización y deserialización correcta (Sparse Voxel Grid).");
    } else {
        console.error("❌ TEST MAPA: Fallo al restaurar bloques.");
    }

    // --- TEST 2: DRACONIANO ---
    const korg = new Draconiano("d1", "Korg", 10, 0, 10);
    korg.salud = 85; // Alteramos el estado base
    korg.inventario.items.set(TipoBloque.COMIDA, 5); // Le damos items
    korg.inventario.cargaActual = 5;

    const korgJSON = korg.toJSON();
    const korgClon = new Draconiano("d1", "Korg", 0, 0, 0); // Creamos uno "limpio"
    korgClon.fromJSON(korgJSON); // Le inyectamos los datos guardados

    const tieneMismaSalud = korgClon.salud === 85;
    const tieneMismaPos = korgClon.posicion.x === 10;
    const tieneMismaComida = korgClon.inventario.items.get(TipoBloque.COMIDA) === 5;

    if (tieneMismaSalud && tieneMismaPos && tieneMismaComida) {
        console.log("✅ TEST DRACONIANO: Atributos metabólicos e inventario restaurados correctamente.");
    } else {
        console.error("❌ TEST DRACONIANO: Fallo al restaurar estado del FSM.");
    }

    console.log("=== TESTS FINALIZADOS ===");
}

ejecutarTests();