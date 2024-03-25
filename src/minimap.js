import { scale } from './world/math/utils';
import { Point } from './world/primitives/point';

export class Minimap {
  constructor(canvas, graph, size) {
    this.canvas = canvas;
    this.graph = graph;
    this.size = size;

    canvas.width = size;
    canvas.height = size;
    this.ctx = canvas.getContext('2d');
  }

  update(viewPoint, bestCar, cars) {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'yellow';
    this.ctx.fillStyle = '#000';
    this.ctx.arc(this.size / 2, this.size / 2, this.size / 2 - 20, 0, Math.PI * 2);
    this.ctx.closePath();
    this.ctx.clip();
    this.ctx.fill();
    this.ctx.stroke();
    const scaler = 0.05;
    const scaledViewPoint = scale(viewPoint, -scaler);
    this.ctx.save();
    this.ctx.translate(
      scaledViewPoint.x + this.size / 2,
      scaledViewPoint.y + this.size / 2,
    );
    this.ctx.scale(scaler, scaler);
    for (const seg of this.graph.segments) {
      seg.draw(this.ctx, { width: 3 / scaler, color: 'white' });
    }
    cars.forEach((car) => {
      if (!car.damaged) {
        new Point(car.x, car.y).draw(this.ctx, { color: 'blue', size: 10 / scaler });
      }
    })
    new Point(bestCar.x, bestCar.y).draw(this.ctx, { color: 'blue', outline: true, size: 15 / scaler });
    this.ctx.restore();
  }
}
