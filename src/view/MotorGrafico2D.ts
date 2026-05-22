export class MotorGrafico2D {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(idCanvas: string) {
        this.canvas = document.getElementById(idCanvas) as HTMLCanvasElement;
        const contexto = this.canvas.getContext('2d');
        
        if (!contexto) throw new Error("Canvas 2D no soportado");
        this.ctx = contexto;
    }

    public limpiarPantalla(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public dibujarCuadradoPrueba(x: number, y: number, tamaño: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, tamaño, tamaño);
    }
}