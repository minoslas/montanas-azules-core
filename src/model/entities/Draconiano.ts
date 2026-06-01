import { Pathfinder } from "../../utils/Pathfinder";
import { Vec3 } from "../../utils/Vector3";
import { GestorTareas } from "../GestorTareas";
import { Mapa } from "../Mapa";
import { EstadoIA, IContextoSimulacion, IInventario, INecesidades, IPosicion3D, ITarea, TipoBloque, TipoTarea } from "../Tipos";

/**
 * @description Entidad principal que representa a un habitante de la colonia. Se basa en una máquina de estados (FSM).
 * @performance O(1) por tick. Mantiene un tamaño en memoria acotado.
 * @contexto Entidad central del Modelo, independiente del Controlador y la Vista (MVC Estricto).
 */
export class Draconiano {
    // --- CONSTANTES DE BALANCEO (Regla #6) ---
    private readonly UMBRAL_CRITICO = 85;
    private readonly DESGASTE_HAMBRE = 0.1;
    private readonly DESGASTE_SED = 0.15;
    private readonly DESGASTE_FATIGA = 0.05;
    private readonly DANO_INANICION = 1.0;
    private readonly RECUPERACION_SUENO = 2.0;
    private readonly CURACION_PASIVA = 10;
    private readonly DISTANCIA_INTERACCION = 1.9; // FIX REGLA #6: Refleja la tolerancia real de pathfinding
    private readonly TOLERANCIA_LLEGADA_NODO = 0.1; // Para suavidad en la navegación A*

    readonly id: string;

    public inventario: IInventario;
    private progresoTrabajo: number = 0;
    private esfuerzoPorTick: number = 25; 

    public nombre: string;
    public posicion: IPosicion3D;
    public necesidades: INecesidades;
    public salud: number = 100;
    public estado: EstadoIA = EstadoIA.IDLE;
    public tareaActual: ITarea | null = null;
    public velocidad: number = 0.5;

    //Nuevo ATRIBUTO: el GPS de Kong:
    private rutaActual: IPosicion3D[] | null = null;    
    private ultimaPosicion: IPosicion3D | null = null;
    private ticksAtascado: number = 0;

    /**
     * @description Verifica integridad vital básica.
     * @performance O(1) 
     */
    public estaVivo(): boolean { return this.salud > 0; }
    
    /**
     * @description Devuelve los slots ocupados de la mochila.
     * @performance O(1)
     */
    public getCargaActual(): number { return this.inventario.cargaActual; }

    /**
     * @description Capacidad máxima en slots configurada al iniciar.
     * @performance O(1)
     */
    public getCapacidadMax(): number { return this.inventario.capacidadMax; }

    constructor(id: string, nombre: string, x: number, y: number, z: number) {
        this.id = id;
        this.nombre = nombre;
        this.posicion = { x, y, z };
        this.necesidades = { hambre: 0, sed: 0, descanso: 0, salud: 100, vejiga: 0, higiene: 0, social: 0 };
        this.inventario = { 
            items: new Map<TipoBloque, number>(), 
            capacidadMax: 10, 
            cargaActual: 0 
        };
    }

    /**
     * @description Actualiza el estado metabólico y la máquina de estados (FSM) del draconiano en este tick.
     * @param {IContextoSimulacion} ctx - Contexto de la simulación con herramientas y ratio temporal.
     * @performance O(1), no genera instanciación de objetos anónimos nuevos, amigable con el GC.
     * @contexto Comunicación por Contexto (Guía de Estilo #1).
     */
    public actualizar(ctx: IContextoSimulacion): void {
        if(!this.estaVivo()) return;

        this.procesarMetabolismo(ctx);

        // Árbol de decisión de prioridades (FSM)
        if (this.necesidades.salud <= 0) {
            this.morir();
            return; 
        }

        // --- EL BUGFIX ESTÁ AQUÍ ---
        // Comprobamos si el Simulador YA le ha dado el mapa hacia el oasis
        const yaEstaSalvandose = this.tareaActual?.tipo === TipoTarea.CONSUMIR;

        // PRIORIDAD VITAL: Si hay peligro, abortamos la minería inmediatamente
        // Hambre y Sed
        if (this.necesidades.sed > this.UMBRAL_CRITICO) {
            const aguaEnMochila = this.inventario.items.get(TipoBloque.AGUA) || 0;

            //La Cantimplora: Si hay agua en la mochila se la beberá.
            if (aguaEnMochila > 0) {
                console.log(`[SUPERVIVENCIA] ${this.nombre} bebe agua directamente de su cantimplora.`);
                this.inventario.items.set(TipoBloque.AGUA, aguaEnMochila - 1);
                this.inventario.cargaActual--;
                this.necesidades.sed = 0;
            }
            // Si no tiene agua en la mochila
            else if (!yaEstaSalvandose && this.estado !== EstadoIA.BUSCAR_RECURSO) {
                console.log(`[ALERTA] ${this.nombre} abandona su tarea por sed.`);
                this.estado = EstadoIA.BUSCAR_RECURSO;
                this.tareaActual = null; // Soltamos la tarea actual
                this.rutaActual = null;  // FIX: Destruimos la ruta para no seguir caminando hacia la tarea vieja
            }
        }
        // Hambre
        else if (this.necesidades.hambre > this.UMBRAL_CRITICO && !yaEstaSalvandose && this.estado !== EstadoIA.BUSCAR_RECURSO) {
            console.log(`[ALERTA] ${this.nombre} abandona su tarea por hambre.`);
            this.estado = EstadoIA.BUSCAR_RECURSO;
            this.tareaActual = null; // Soltamos la tarea actual para que vuelva al Gestor
            this.rutaActual = null;  // FIX: Destruimos la ruta fantasma
        }
        // Prioridad Vital 2 Issue #10 Fatiga extrema
        else if (this.necesidades.descanso > this.UMBRAL_CRITICO && this.estado !== EstadoIA.DORMIR) {
            console.log(`[SUEÑO] ${this.nombre} cae rendido de fatiga en X:${this.posicion.x}.`);
            this.estado = EstadoIA.DORMIR;
            this.tareaActual = null; // Dejamos de Trabajar
            this.rutaActual = null;  // FIX: Destruimos la ruta fantasma
        }

        // --- FÍSICAS DE GRAVEDAD DINÁMICA ---
        // Si estamos en el aire o pisamos agua (que no tiene suelo sólido debajo), caemos.
        const xCentro = Math.round(this.posicion.x);
        const yPies = Math.floor(this.posicion.y);
        const zCentro = Math.round(this.posicion.z);
        
        const bloqueAbajo = ctx.mapa.getBloque(xCentro, yPies - 1, zCentro);
        
        if (bloqueAbajo === TipoBloque.AIRE || bloqueAbajo === TipoBloque.AGUA) {
            this.posicion.y -= this.velocidad; // Caída libre (Gravedad)
            if (this.rutaActual) this.limpiarEstado(); // El susto les hace perder la concentración
            return; // No procesamos FSM mientras caemos
        } else if (this.posicion.y > yPies) {
            this.posicion.y = yPies; // Nos encajamos limpiamente en el suelo sólido
        }

        switch (this.estado) {
            case EstadoIA.IDLE:
                this.buscarTrabajo(ctx);
                break;
            case EstadoIA.MOVING:
                this.moverseATarea(ctx);
                break;
            case EstadoIA.WORKING:
                this.trabajar(ctx);
                break;
            case EstadoIA.BUSCAR_RECURSO:
                // FIX DEL BUCLE: Si estamos buscando recursos, esperamos la orden del Simulador.
                // NO volvemos a IDLE si no tenemos tarea.
                if (this.tareaActual) {
                    this.moverseATarea(ctx);
                } else if (ctx.tickActual % 5 === 0) {
                    // Mensaje esporádico para no saturar la consola
                    console.log(`[IA] ${this.nombre} brama pidiendo comida/agua...`);
                }
                break;
            case EstadoIA.DORMIR:
                this.dormir(ctx);
                break;
        }
    }

    /**
     * @description Actualiza el nivel de hambre, sed y descanso, restando salud si llegan a niveles críticos.
     * @param {IContextoSimulacion} ctx - Contexto inyectado en el tick actual.
     * @performance O(1). Modifica primitivos directamente.
     * @contexto Mecánica vital de supervivencia.
     */
    private procesarMetabolismo(ctx: IContextoSimulacion): void {
        const ratio = ctx.ratio;

        // modificado en modo test extricto para que actue agua y sed
        this.necesidades.hambre += this.DESGASTE_HAMBRE * ratio; 
        this.necesidades.sed += this.DESGASTE_SED * ratio;
        
        // Solo nos cansamos si no estamos durmiendo Issue #10
        if(this.estado !== EstadoIA.DORMIR) {
            this.necesidades.descanso += this.DESGASTE_FATIGA * ratio;
        }

        if(this.necesidades.hambre >= 100 || this.necesidades.sed >= 100 || this.necesidades.descanso >= 100) {
            this.salud -= this.DANO_INANICION * ratio; 
            if(ctx.tickActual % 10 === 0) console.log(`[PELIGRO] ${this.nombre} está muriendo de inanición/deshidratación...`);
        }
    }

    /**
     * @description Verifica si la tarea actual sigue siendo válida en el mapa (cumplida por otro colono).
     * @contexto Validación dinámica de tareas y concurrencia.
     */
    private validarTarea(ctx: IContextoSimulacion): boolean {
        if (!this.tareaActual) return false;
        
        const p = this.tareaActual.posicion;
        const b = ctx.mapa.getBloque(p.x, p.y, p.z);
        
        if (this.tareaActual.tipo === TipoTarea.PICAR) {
            if (b === TipoBloque.AIRE || b === TipoBloque.AGUA) return false;
        } else if (this.tareaActual.tipo === TipoTarea.CONSTRUIR) {
            if (b !== TipoBloque.AIRE && b !== TipoBloque.AGUA) return false;
        } else if (this.tareaActual.tipo === TipoTarea.RECOLECTAR) {
            if (b === TipoBloque.AIRE) return false; // Ya fue recolectado
        }
        return true;
    }

    /**
     * @description Intenta asignar la tarea espacialmente más cercana al draconiano si tiene capacidad en su inventario.
     * @param {GestorTareas} gestor - Gestor de tareas inyectado vía contexto.
     * @performance O(N) donde N es el número de tareas en cola. Delegado al Gestor.
     * @contexto Autogestión laboral para el ciclo de IDLE optimizado por vecindad.
     */
    private buscarTrabajo(ctx: IContextoSimulacion): void {
        const gestor = ctx.gestor;
        // Solo buscamos trabajo si hay espacio (OJO: para construir, sí queremos trabajar aunque la mochila esté llena)
        if (this.getCargaActual() >= this.getCapacidadMax() && this.estado !== EstadoIA.WORKING) {
            // Nota: La intercepción logística del Simulador ya se encarga de enviarlo a descargar,
            // pero si hay una tarea de CONSTRUIR cerca, podría usar esa piedra en lugar de descargarla.
        }

        // ISSUE #9: Comprobamos si llevamos piedra
        const cantidadPiedra = this.inventario.items.get(TipoBloque.PIEDRA) || 0;
        const tienePiedra = cantidadPiedra > 0;

        // Pasamos nuestra posición para que el Gestor calcule la proximidad
        const tarea = gestor.obtenerTareaDisponible(ctx, this.posicion, tienePiedra);
        if (tarea) {
            this.tareaActual = tarea;
            gestor.asignarTarea(tarea.id);
            this.estado = EstadoIA.MOVING;
            this.rutaActual = null; // FIX: Nos aseguramos de pedir una nueva ruta al GPS
        }
    }

/**
     * @description Navega hacia la tarea usando Pathfinder (A*). Sigue sujeto a gravedad dinámica.
     * @param {IContextoSimulacion} ctx - Contexto con acceso al mapa.
     * @contexto Navegación A* (Issue #14).
     */
    private moverseATarea(ctx: IContextoSimulacion): void {
        if (!this.tareaActual) {
            this.limpiarEstado();
            return;
        }

        // 1. Validamos que la tarea aún no haya sido completada por otro clon
        if (!this.validarTarea(ctx)) {
            console.log(`[IA] ${this.nombre} cancela su ruta porque la tarea ya fue completada por otro.`);
            ctx.gestor.finalizarTarea(this.tareaActual.id);
            this.limpiarEstado();
            return;
        }

        const destino = this.tareaActual.posicion;

        // CONTROL DE LLEGADA: ¿Estamos lo suficientemente cerca de la tarea?
        // FIX: Eliminado número mágico, usamos la constante de la clase
        if (Vec3.distancia(this.posicion, destino) <= this.DISTANCIA_INTERACCION) {
            this.rutaActual = null;
            if (this.tareaActual.tipo === TipoTarea.CONSUMIR) this.ejecutarConsumo(); 
            else if (this.tareaActual.tipo === TipoTarea.DEPOSITAR) this.ejecutarDescarga(ctx); 
            else this.estado = EstadoIA.WORKING;
            return;
        }

        // SOLICITUD DE RUTA: Si no tenemos ruta, llamamos al GPS
        if (!this.rutaActual || this.rutaActual.length === 0) {
            this.rutaActual = Pathfinder.encontrarRuta(ctx.mapa, this.posicion, destino);
            
            // Si el Pathfinder falla (array vacío o null), es un bloque enterrado
            if (!this.rutaActual || this.rutaActual.length === 0) {
                
                // 1. En lugar de borrar la tarea para siempre, la devolvemos castigada
                if(ctx.gestor) ctx.gestor.reprogramarTarea(this.tareaActual.id, ctx.tickActual); 
                
                // 2. Limpiamos estado y volvemos a IDLE para pedir una mejor alternativa
                this.limpiarEstado();
                return;
            }
        }

        // NAVEGACIÓN: Nos movemos hacia el siguiente punto de la ruta
        const siguientePunto = this.rutaActual[0];
        
        // --- VALIDACIÓN DINÁMICA DE RUTA ---
        // Evita que se queden atascados si alguien bloquea su camino o se edita el terreno frente a ellos
        const bloqueEnCamino = ctx.mapa.getBloque(siguientePunto.x, siguientePunto.y, siguientePunto.z);
        if (bloqueEnCamino !== TipoBloque.AIRE && bloqueEnCamino !== TipoBloque.AGUA) {
            console.log(`[NAVEGACIÓN] ${this.nombre} se topó con un obstáculo dinámico. Recalculando...`);
            this.rutaActual = null; // Ruta obstruida, forzamos un recálculo limpio al próximo tick
            return;
        }

        // --- SISTEMA ANTI-ATASCOS (Evitación de Bloqueos Físicos) ---
        if (this.ultimaPosicion && Vec3.distanciaCuadrada(this.posicion, this.ultimaPosicion) < 0.001) {
            this.ticksAtascado++;
            if (this.ticksAtascado > 15) {
                console.warn(`[ATASCO] ${this.nombre} se quedó atorado físicamente. Desandando camino e intentando alternativa.`);
                this.rutaActual = null;
                if(ctx.gestor) ctx.gestor.reprogramarTarea(this.tareaActual.id, ctx.tickActual);
                this.limpiarEstado();
                // Lo centramos en la baldosa forzosamente para desengancharlo de las aristas
                this.posicion.x = Math.round(this.posicion.x);
                this.posicion.y = Math.round(this.posicion.y);
                this.posicion.z = Math.round(this.posicion.z);
                return;
            }
        } else {
            this.ticksAtascado = 0;
            this.ultimaPosicion = { x: this.posicion.x, y: this.posicion.y, z: this.posicion.z };
        }

        // Si estamos muy cerca del punto intermedio, pasamos al siguiente
        if (Vec3.distanciaCuadrada(this.posicion, siguientePunto) < this.TOLERANCIA_LLEGADA_NODO) {
            
            this.posicion.x = siguientePunto.x;
            this.posicion.y = siguientePunto.y;
            this.posicion.z = siguientePunto.z;

            this.rutaActual.shift(); // Quitamos el nodo alcanzado

        } else {
            Vec3.moverHacia(this.posicion, siguientePunto, this.velocidad);
        }
    }

    // Nombre corregido para mantener consistencia con ejecutarDescarga
    /**
     * @description Restaura las necesidades vitales del draconiano y aplica curación pasiva.
     * @performance O(1), mutación de variables primitivas.
     * @contexto Cierre del ciclo de tarea vital (consumir agua o comida).
     */
    private ejecutarConsumo(): void {
        console.log(`[SUPERVIVENCIA] ${this.nombre} se está alimentando/hidratando.`);
        
        // Reseteamos las necesidades críticas
        this.necesidades.hambre = 0;
        this.necesidades.sed = 0;
        
        // Un poco de curación pasiva por haber sobrevivido
        if (this.salud < 100) {
            this.salud += this.CURACION_PASIVA;
        }

        this.limpiarEstado();
        console.log(`[IA] ${this.nombre} ha recuperado fuerzas y vuelve al trabajo.`);
    }

    /**
     * @description Acumula progreso en la tarea actual. Desencadena la finalización al llegar al 100%.
     * @param {IContextoSimulacion} ctx - Contexto inyectado en el tick actual.
     * @performance O(1).
     */
    private trabajar(ctx: IContextoSimulacion): void {
        // SUPER-GUARDIA: Si estamos en estado WORKING, es un error lógico no tener tarea.
        // Esto nos protege de estados corruptos (p.ej. al cargar partida) y evita un crash.
        if (!this.tareaActual) {
            console.error(`[ERROR LÓGICO] ${this.nombre} está en estado WORKING sin tarea. Volviendo a IDLE.`);
            this.limpiarEstado();
            return;
        }

        // Verificamos si alguien más ya completó esta tarea mientras minábamos
        if (!this.validarTarea(ctx)) {
            console.log(`[IA] ${this.nombre} cancela el trabajo porque la tarea fue finalizada por otro clon.`);
            if (this.tareaActual) ctx.gestor.finalizarTarea(this.tareaActual.id);
            this.limpiarEstado();
            return;
        }

        // Guardia de seguridad: si por algún motivo entra a trabajar con tarea de depositar
        if (this.tareaActual.tipo === TipoTarea.DEPOSITAR) {
            this.ejecutarDescarga(ctx); //Ahora si reconoce ctx
            return;
        }

        this.progresoTrabajo += this.esfuerzoPorTick;

        if (this.progresoTrabajo >= 100) {
            if(this.tareaActual.tipo === TipoTarea.CONSTRUIR) {
                this.finalizarConstruccion(ctx);
            } else if(this.tareaActual.tipo === TipoTarea.RECOLECTAR) {
                this.finalizarRecoleccion(ctx); // Nuevo Issue #11
            } else {
                this.finalizarMineria(ctx);
            }
        }
    }

    /**
     * @description Concluye una tarea minera: añade recurso al inventario y cambia el mapa a AIRE.
     * @param {IContextoSimulacion} ctx - Contexto inyectado de la simulación para alterar el mapa y finalizar la tarea.
     * @performance O(1) impacto en la estructura Map del mapa.
     */
    private finalizarMineria(ctx: IContextoSimulacion): void {
        const p = this.tareaActual!.posicion;

        if (this.inventario.cargaActual < this.inventario.capacidadMax) {
            const actual = this.inventario.items.get(TipoBloque.PIEDRA) || 0;
            this.inventario.items.set(TipoBloque.PIEDRA, actual + 1);
            this.inventario.cargaActual++;
            console.log(`[INV] ${this.nombre} cargó PIEDRA (${this.inventario.cargaActual}/10).`);
        }

        ctx.mapa.setBloque(p.x, p.y, p.z, TipoBloque.AIRE);
        ctx.gestor.finalizarTarea(this.tareaActual!.id);
        this.limpiarEstado();
    }

     /**
     * @description Extrae un bloque de Agua/Recurso y lo guarda en el Inventario.
     * @param {IContextoSimulacion} ctx - Contexto inyectado de la simulación.
     * @performance O(1). Acceso y mutación en el Map sin estructuras pesadas.
     * @contexto Recoleccion de recursos naturales (agua en este caso) (Issue #11).
     */
    private finalizarRecoleccion(ctx: IContextoSimulacion) {
        const posicion = this.tareaActual!.posicion;

        //Confirmamos que bloque esta recolectando actualmente
        const bloqueEnMapa = ctx.mapa.getBloque(posicion.x, posicion.y, posicion.z);
        
        if (this.inventario.cargaActual < this.inventario.capacidadMax) {
            // Guardamos el bloque (en este caso agua)
            const actual = this.inventario.items.get(bloqueEnMapa) || 0;
            this.inventario.items.set(bloqueEnMapa, actual + 1);
            this.inventario.cargaActual++;
            console.log(`[INV] ${this.nombre} recolectó un recurso (${this.inventario.cargaActual}/10).`);
        }

        // Por el momento, el "manantial" se seca
        ctx.mapa.setBloque(posicion.x, posicion.y, posicion.z, TipoBloque.AIRE);
        ctx.gestor.finalizarTarea(this.tareaActual!.id);
        this.limpiarEstado();
    }

    /**
     * @description Consume una unidad de piedra del inventario y coloca un MURO_CONSTRUIDO en el mapa.
     * @param {IContextoSimulacion} ctx - Contexto inyectado de la simulación.
     * @contexto Albañilería básica (Issue #9).
     */
    private finalizarConstruccion(ctx: IContextoSimulacion): void {
        const p = this.tareaActual!.posicion;
        const piedraActual = this.inventario.items.get(TipoBloque.PIEDRA) || 0;

        if (piedraActual > 0) {
            // Consumimos el recurso
            this.inventario.items.set(TipoBloque.PIEDRA, piedraActual - 1);
            this.inventario.cargaActual--;
            
            // Alteramos el entorno
            ctx.mapa.setBloque(p.x, p.y, p.z, TipoBloque.MURO_PIEDRA);
            console.log(`[CONSTRUCCIÓN] ${this.nombre} erigió un muro en X:${p.x}. Piedra restante: ${piedraActual - 1}`);
        } else {
            console.warn(`[ERROR LÓGICO] ${this.nombre} intentó construir sin piedra.`);
        }

        ctx.gestor.finalizarTarea(this.tareaActual!.id);
        this.limpiarEstado();
    }

    /**
     * @description Vacía la carga en el almacén logístico.
     * @param {IContextoSimulacion} contexto - Contexto inyectado de la simulación con los almacenes.
     * @performance O(1). Usa .clear() del Map para ser amigable con la RAM y el GC.
     * @contexto Logística de inventario (Regla de Memoria).
     */
    private ejecutarDescarga(contexto: IContextoSimulacion): void {
        const posicion = this.tareaActual!.posicion;

        //buscamos el almacen en nuestras cordenadas
        const almacenDestino = contexto.almacenes.find(a => a.posicion.x === posicion.x && a.posicion.y === posicion.y && a.posicion.z === posicion.z);

        if (almacenDestino) {
            //Transferimos los Items uno a uno
            for (const [tipo, cantidad] of this.inventario.items.entries()) {
                const stockActual = almacenDestino.inventario.get(tipo) || 0;
                almacenDestino.inventario.set(tipo, stockActual + cantidad);
                console.log(`[LOGÍSTICA] ${this.nombre} depositó ${cantidad} de ${TipoBloque[tipo]} en el Almacén.`);
            }
        } else {
            console.warn(`[ERROR LÓGICO] ${this.nombre} intentó descargar pero no hay almacén en X:${posicion.x}.`);
        }
        // Ahoraa vaciamos la mochila
        this.inventario.items.clear();
        this.inventario.cargaActual = 0;
        this.limpiarEstado();
        console.log(`[LOGÍSTICA] ${this.nombre} vació su mochila.`);
    }

    /**
     * @description Limpia el progreso y la tarea para dejar a la entidad libre.
     * @performance O(1) limpieza de punteros (GC Friendly).
     * @contexto Retorno al estado neutral IDLE.
     */
    private limpiarEstado(): void {
        this.tareaActual = null;
        this.progresoTrabajo = 0;
        this.estado = EstadoIA.IDLE;
        this.rutaActual = null; // FIX: Limpieza profunda del GPS al acabar de trabajar
        this.ticksAtascado = 0;
        this.ultimaPosicion = null;
    }

    /**
     * @description Lógica de recuperación de energía durante el estado de sueño.
     * @param {IContextoSimulacion} ctx - Contexto de la simulación.
     * @performance O(1).
     * @contexto Sistema de fatiga y descanso (Issue #10).
     */
    private dormir(ctx: IContextoSimulacion): void {
        // Recuperamos energía rápidamente (ej: 2 puntos por tick)
        this.necesidades.descanso -= this.RECUPERACION_SUENO * ctx.ratio;

        if (this.necesidades.descanso <= 0) {
            this.necesidades.descanso = 0; // Evitamos números negativos
            this.estado = EstadoIA.IDLE; // Despertamos listos para pedir trabajo
            console.log(`[SUEÑO] ${this.nombre} ha despertado con energías renovadas.`);
        }
    }

    /**
     * @description Manejador de evento final cuando la salud llega a 0.
     * @performance O(1)
     */
    private morir(): void {
        console.log(`[💀] ${this.nombre} ha perecido en las minas. El valle cobra su tributo.`);
    }

    /**
     * @description Serializa el estado metabólico, de IA y el inventario del Draconiano a JSON.
     * @performance O(I) donde I son los items en la mochila. Creación de objeto plano temporal.
     * @contexto Persistencia y guardado de partidas (Regla #7).
     */
    public toJSON(): string {
        const estadoPlano = {
            id: this.id,
            nombre: this.nombre,
            posicion: this.posicion,
            necesidades: this.necesidades,
            salud: this.salud,
            estado: this.estado,
            tareaActual: this.tareaActual,
            progresoTrabajo: this.progresoTrabajo,
            inventario: {
                capacidadMax: this.inventario.capacidadMax,
                cargaActual: this.inventario.cargaActual,
                items: Array.from(this.inventario.items.entries()) // Map -> Array para serializar
            }
        };
        return JSON.stringify(estadoPlano);
    }

    /**
     * @description Restaura el estado de la entidad desde una cadena JSON, siendo respetuoso con el GC.
     * @param {string} json - Cadena JSON del estado.
     * @performance O(I) para restaurar el inventario. Reutiliza las referencias previas (Map).
     * @contexto Carga de partidas salvadas (Regla #7).
     */
    public fromJSON(json: string): void {
        try {
            const datos = JSON.parse(json);
            
            // Restauración directa de propiedades primitivas y objetos básicos
            if (datos.posicion) this.posicion = datos.posicion;
            if (datos.necesidades) this.necesidades = datos.necesidades;
            if (datos.salud !== undefined) this.salud = datos.salud;
            if (datos.estado !== undefined) this.estado = datos.estado;
            if (datos.tareaActual !== undefined) this.tareaActual = datos.tareaActual;
            if (datos.progresoTrabajo !== undefined) this.progresoTrabajo = datos.progresoTrabajo;

            // Restauración cuidadosa del Inventario (GC Friendly)
            if (datos.inventario) {
                this.inventario.capacidadMax = datos.inventario.capacidadMax ?? this.inventario.capacidadMax;
                this.inventario.cargaActual = datos.inventario.cargaActual ?? this.inventario.cargaActual;
                
                if (Array.isArray(datos.inventario.items)) {
                    this.inventario.items.clear(); // Limpiamos el Map existente sin destruirlo
                    for (const [tipo, cantidad] of datos.inventario.items) {
                        this.inventario.items.set(tipo as TipoBloque, cantidad);
                    }
                }
            }
        } catch (error) {
            console.error(`[ERROR] Fallo al deserializar el estado del draconiano ${this.nombre}.`, error);
        }
    }
}