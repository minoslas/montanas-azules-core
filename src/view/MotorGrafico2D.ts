export class MotorGrafico2D {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // Escala: Cuántos píxeles representa un bloque (Voxel) de nuestro mundo
    public readonly TAMANO_BLOQUE = 16; 

    constructor(idCanvas: string) {
        this.canvas = document.getElementById(idCanvas) as HTMLCanvasElement;
        const contexto = this.canvas.getContext('2d');
        if (!contexto) throw new Error("Canvas 2D no soportado");
        this.ctx = contexto;
    }

    public limpiarPantalla(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Dibuja los bloques estáticos del mapa con su color correspondiente.
     */
    public dibujarMapa(bloques: {x: number, y: number, color: string}[]): void {
        for (const bloque of bloques) {
            this.ctx.fillStyle = bloque.color;
            
            const pixelX = bloque.x * this.TAMANO_BLOQUE;
            const pixelY = bloque.y * this.TAMANO_BLOQUE;
            
            this.ctx.fillRect(pixelX, pixelY, this.TAMANO_BLOQUE, this.TAMANO_BLOQUE);
            
            // Un borde oscuro y tenue para dar textura de "Voxel"
            this.ctx.strokeStyle = "#222222"; 
            this.ctx.strokeRect(pixelX, pixelY, this.TAMANO_BLOQUE, this.TAMANO_BLOQUE);
        }
    }

    /**
     * Dibuja los almacenes de la colonia.
     */
    public dibujarAlmacenes(almacenes: {x: number, y: number}[]): void {
        this.ctx.fillStyle = "#FFD700"; // Color Dorado para el Almacén
        
        for (const alm of almacenes) {
            const pixelX = alm.x * this.TAMANO_BLOQUE;
            const pixelY = alm.y * this.TAMANO_BLOQUE;
            
            // Dibujamos el bloque dorado
            this.ctx.fillRect(pixelX, pixelY, this.TAMANO_BLOQUE, this.TAMANO_BLOQUE);
            
            // Le ponemos un borde blanco interior para que parezca un cofre/edificio importante
            this.ctx.strokeStyle = "#FFFFFF";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(pixelX + 2, pixelY + 2, this.TAMANO_BLOQUE - 4, this.TAMANO_BLOQUE - 4);
            this.ctx.lineWidth = 1; // Restaurar grosor
        }
    }

/**
     * Dibuja a los colonos (Draconianos) en movimiento.
     */
    public dibujarEntidades(entidades: {x: number, y: number, color?: string}[]): void {
        for (const entidad of entidades) {
            // Si la entidad trae un color propio lo usamos, si no, usamos el verde por defecto
            this.ctx.fillStyle = entidad.color || "#44ff44"; 
            
            const pixelX = entidad.x * this.TAMANO_BLOQUE;
            const pixelY = entidad.y * this.TAMANO_BLOQUE;
            
            // Dibujamos al draconiano un poco más pequeño que el bloque para que destaque
            this.ctx.fillRect(pixelX + 2, pixelY + 2, this.TAMANO_BLOQUE - 4, this.TAMANO_BLOQUE - 4);
        }
    }
}