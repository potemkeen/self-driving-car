import { Segment } from '../primitives/segment';
import { angle, translate } from '../math/utils';
import { Envelope } from '../primitives/envelope';

export class Marking {
  constructor(center, directionVector, width, height) {
    this.center = center;
    this.directionVector = directionVector;
    this.width = width;
    this.height = height;

    this.support = new Segment(
      translate(center, angle(directionVector), height / 2),
      translate(center, angle(directionVector), -height / 2),
    );
    this.poly = new Envelope(this.support, width, 0).poly;
    this.type = 'marking';
  }

  toJSON() {
    return {
      c: this.center,
      dv: this.directionVector,
      w: this.width,
      h: this.height,
      t: this.type,
    };
  }

  draw(ctx) {
    this.poly.draw(ctx);
  }
}
