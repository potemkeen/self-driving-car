import { Controls } from './controls';
import { Sensor } from './sensor';
import { polysIntersect } from './utils';
import { NeuralNetwork } from './network';
import carImg from '../static/car.png';

export class Car {
  constructor(
    x,
    y,
    width,
    height,
    controlType,
    angle = 0,
    maxSpeed = 3,
    color,
    isTexture = false,
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.speed = 0;
    this.accelaretion = 0.2;
    this.maxSpeed = maxSpeed;
    this.friction = 0.05;
    this.angle = angle;
    this.damaged = false;
    this.fittness = 0;

    this.useBrain = controlType === 'AI';

    if (controlType !== 'DUMMY') {
      this.sensor = new Sensor(this);
      this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
    }
    this.controls = new Controls(controlType);
    this.polygon = [];

    this._color = color;
    this.isTexture = isTexture;
    if (isTexture) {
      this.img = new Image();
      this.img.src = carImg;

      this.mask = document.createElement('canvas');
      this.mask.width = width;
      this.mask.height = height;

      this.maskCtx = this.mask.getContext('2d');
      this.img.onload = () => {
        this.#drawImage();
      };
    }
  }

  #drawImage() {
    this.maskCtx.fillStyle = this._color;
    this.maskCtx.rect(0, 0, this.width, this.height);
    this.maskCtx.fill();

    this.maskCtx.globalCompositeOperation = 'destination-atop';
    this.maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
  }

  set color(color) {
    this._color = color;
    if (this.isTexture) {
      this.#drawImage();
    }
  }

  update(roadBorders, traffic) {
    if (this.damaged) {
      return;
    }

    this.#move();
    this.fittness += this.speed;
    this.polygon = this.#createPolygon();
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic);
      const offsets = this.sensor.readings.map((r) =>
        r === null ? 0 : 1 - r.offset,
      );
      const outputs = NeuralNetwork.feedForward(offsets, this.brain);

      if (this.useBrain) {
        this.controls.forward = outputs[0];
        this.controls.left = outputs[1];
        this.controls.right = outputs[2];
        this.controls.reverse = outputs[3];
      }
    }
    this.damaged = this.#assessDamage(roadBorders, traffic);
  }

  #assessDamage(roadBorders, traffic) {
    for (const border of roadBorders) {
      if (polysIntersect(this.polygon, [border.p1, border.p2])) {
        return true;
      }
    }
    for (let i = 0; i < traffic.length; i++) {
      if (this.y < traffic[i].y && this.trafficPassed < i + 1) {
        this.trafficPassed = i + 1;
      }
      if (
        this !== traffic[i] &&
        polysIntersect(this.polygon, traffic[i].polygon)
      ) {
        return true;
      }
    }
    return false;
  }

  #createPolygon() {
    const points = [];
    const rad = Math.hypot(this.width, this.height) / 2;
    const alpha = Math.atan2(this.width, this.height);
    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    });
    return points;
  }

  #move() {
    if (this.controls.forward) {
      this.speed += this.accelaretion;
    }
    if (this.controls.reverse) {
      this.speed -= this.accelaretion;
    }
    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed;
    }
    if (this.speed < -this.maxSpeed) {
      this.speed = -this.maxSpeed / 2;
    }
    if (this.speed > 0) {
      this.speed -= this.friction;
    }
    if (this.speed < 0) {
      this.speed += this.friction;
    }
    if (Math.abs(this.speed) < this.friction) {
      this.speed = 0;
    }
    if (this.speed !== 0) {
      const flip = this.speed > 0 ? 1 : -1;
      if (this.controls.left) {
        this.angle += 0.03 * flip;
      }
      if (this.controls.right) {
        this.angle -= 0.03 * flip;
      }
    }
    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx, drawSensor = false) {
    if (this.sensor && drawSensor) {
      this.sensor.draw(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);

    if (this.isTexture) {
      if (!this.damaged) {
        ctx.drawImage(
          this.mask,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height,
        );
        ctx.globalCompositeOperation = 'multiply';
      }
      ctx.drawImage(
        this.img,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
    } else {
      ctx.beginPath();
      ctx.fillStyle = this._color;
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
    }
    ctx.restore();
  }
}
