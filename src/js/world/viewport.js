import { Point } from './primitives/point';
import { add, scale, subtract } from './math/utils';

export class Viewport {
    constructor(canvas, zoom = 1, offset = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.zoom = zoom;
        this.center = new Point(canvas.width / 2, canvas.height / 2);
        this.offset = offset ? offset : scale(this.center, -1);

        this.pan = {
            start: new Point(0, 0),
            end: new Point(0, 0),
            offset: new Point(0, 0),
            active: false
        };

        this.#addEventListeners();
    }

    reset() {
        this.ctx.restore();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.center.x, this.center.y);
        this.ctx.scale(1 / this.zoom, 1 / this.zoom);
        const offset = this.getOffset();
        this.ctx.translate(offset.x, offset.y);
    }

    getMouse(event, subtractPanOffset = false) {
        const p = new Point(
            (event.offsetX - this.center.x) * this.zoom - this.offset.x,
            (event.offsetY - this.center.y) * this.zoom - this.offset.y,
        );
        return subtractPanOffset ? subtract(p, this.pan.offset) : p;
    }

    getOffset() {
        return add(this.offset, this.pan.offset);
    }

    #addEventListeners() {
        this.canvas.addEventListener('mousewheel', this.#handleMouseWheel.bind(this));
        this.canvas.addEventListener('mousedown', this.#handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.#handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.#handleMouseUp.bind(this));
    }

    #handleMouseWheel(event) {
        const dir = Math.sign(event.deltaY);
        const step = 0.1;
        this.zoom += dir * step;
        this.zoom = Math.max(1, Math.min(5, this.zoom));
    }

    #handleMouseDown(event) {
        if (event.button === 1) { // middle button
            this.pan.start = this.getMouse(event);
            this.pan.active = true;
            document.body.style.cursor = 'grab';
        }
    }

    #handleMouseMove(event) {
        if (this.pan.active) {
            this.pan.end = this.getMouse(event);
            this.pan.offset = subtract(this.pan.end, this.pan.start);
        }
    }

    #handleMouseUp() {
        if (this.pan.active) {
            this.offset = add(this.offset, this.pan.offset);
            this.pan = {
                start: new Point(0, 0),
                end: new Point(0, 0),
                offset: new Point(0, 0),
                active: false,
            };
            document.body.style.cursor = 'auto';
        }
    }
}
