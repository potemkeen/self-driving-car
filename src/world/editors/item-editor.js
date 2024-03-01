import { getNearestItem, scale, subtract } from '../math/utils';
import { Polygon } from '../primitives/polygon';

export class ItemEditor {
  constructor(viewport, items) {
    this.viewport = viewport;
    this.items = items;
    this.isEnabled = false;

    this.canvas = viewport.canvas;
    this.ctx = this.canvas.getContext('2d');

    this.mouse = null;
    this.mouseInitPos = null;
    this.selected = null;
    this.selectedBaseInit = null;
    this.hovered = null;
  }

  enable() {
    this.#addEventListeners();
    this.isEnabled = true;
  }

  disable() {
    this.#removeEventListeners();
    this.mouseInitPos = null;
    this.selected = null;
    this.selectedBaseInit = null;
    this.hovered = null;
    this.isEnabled = false;
  }

  #addEventListeners() {
    this.boundMouseDown = this.#handleMouseDown.bind(this);
    this.boundMouseMove = this.#handleMouseMove.bind(this);
    this.boundContextMenu = (e) => e.preventDefault();
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
  }

  #removeEventListeners() {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
  }

  #handleMouseMove(event) {
    this.mouse = this.viewport.getMouse(event, true);
    if (this.selected) {
      const offset = subtract(this.mouse, this.mouseInitPos);
      this.selected.base = Polygon.offset(this.selectedBaseInit, offset);
      return;
    }
    this.hovered = getNearestItem(
      this.mouse,
      this.items,
      10 * this.viewport.zoom,
    );
  }

  #handleMouseDown(event) {
    if (event.button === 0) {
      // left click
      if (this.hovered) {
        this.selected = this.hovered;
        this.selectedBaseInit = this.hovered.base;
        this.hovered = null;
        this.mouseInitPos = this.mouse;
        return;
      }
      if (this.selected) {
        this.selected = null;
        this.mouseInitPos = null;
        this.selectedBaseInit = null;
        return;
      }
    }
    if (event.button === 2) {
      // right click
      if (this.hovered) {
        const index = this.items.findIndex((b) => b === this.hovered);
        this.items.splice(index, 1);
        this.hovered = null;
        return;
      }
      if (this.selected) {
        this.selected.base = this.selectedBaseInit;
        this.selected = null;
        this.mouseInitPos = null;
      }
    }
  }

  display() {
    if (!this.isEnabled) {
      return;
    }
    const viewPoint = scale(this.viewport.getOffset(), -1);
    if (this.hovered) {
      this.hovered.draw(this.ctx, viewPoint, { color: 'red' });
    }
    if (this.selected) {
      this.selected.draw(this.ctx, viewPoint, { color: 'green' });
    }
  }
}
