import { Envelope } from './primitives/envelope';
import { Polygon } from './primitives/polygon';
import { add, distance, getNearestPoint, lerp, scale } from './math/utils';
import { Segment } from './primitives/segment';
import { Point } from './primitives/point';
import { Tree } from './items/tree';
import { Building } from './items/building';
import { Light } from './markings/light';
import { Graph } from './math/graph';
import { createMarking } from './markings/marking-factory';
import { Start } from './markings/start';

export class World {
  constructor(
    graph,
    roadWidth = 100,
    roadRoundness = 10,
    buildingWidth = 150,
    buildingMinLength = 150,
    spacing = 50,
    treeSize = 160,
  ) {
    this.graph = graph;
    this.roadWidth = roadWidth;
    this.roadRoundness = roadRoundness;
    this.buildingWidth = buildingWidth;
    this.buildingMinLength = buildingMinLength;
    this.spacing = spacing;
    this.treeSize = treeSize;

    this.envelopes = [];
    this.roadBorders = [];
    this.buildings = [];
    this.trees = [];
    this.laneGuides = [];

    this.markings = [];

    this.cars = [];
    this.bestCar = null;

    this.frameCount = 0;

    this.generate();
  }

  static load(info) {
    const world = new World(new Graph());
    world.graph = Graph.load(info.g);
    world.roadWidth = info.rw;
    world.roadRoundness = info.rr;
    world.buildingWidth = info.bw;
    world.buildingMinLength = info.bml;
    world.spacing = info.s;
    world.treeSize = info.ts;
    world.envelopes = info.e.map(Envelope.load);
    world.roadBorders = info.rb.map((b) => new Segment(b.p1, b.p2));
    world.laneGuides.length = 0;
    world.laneGuides.push(...info.lg.map((g) => new Segment(g.p1, g.p2)));
    world.buildings = info.b.map(Building.load);
    world.trees = info.t.map((t) => Tree.load(t, world.treeSize));
    world.markings = info.m.map(createMarking);
    world.zoom = info.z;
    world.offset = new Point(info.o.x, info.o.y);
    return world;
  }

  toJSON() {
    return {
      g: this.graph,
      rw: this.roadWidth,
      rr: this.roadRoundness,
      bw: this.buildingWidth,
      bml: this.buildingMinLength,
      s: this.spacing,
      ts: this.treeSize,
      e: this.envelopes,
      rb: this.roadBorders,
      lg: this.laneGuides,
      b: this.buildings,
      t: this.trees,
      m: this.markings,
      z: this.zoom,
      o: this.offset,
    };
  }

  generate() {
    this.envelopes = this.#generateEnvelopes();

    this.roadBorders = this.#generateRoadBorders();
    this.buildings.length = 0;
    this.buildings.push(...this.#generateBuildings());
    this.trees = this.#generateTrees();

    this.laneGuides.length = 0;
    this.laneGuides.push(...this.#generateLaneGuides());
  }

  #generateEnvelopes() {
    return this.graph.segments.map(
      (seg) => new Envelope(seg, this.roadWidth, this.roadRoundness),
    );
  }

  #generateRoadBorders() {
    return Polygon.union(this.envelopes.map((e) => e.poly));
  }

  #generateLaneGuides() {
    const tempEnvelopes = [];
    for (const seg of this.graph.segments) {
      tempEnvelopes.push(
        new Envelope(seg, this.roadWidth / 2, this.roadRoundness),
      );
    }

    return Polygon.union(tempEnvelopes.map((e) => e.poly));
  }

  #generateTrees() {
    const points = [
      ...this.roadBorders.map((s) => [s.p1, s.p2]).flat(),
      ...this.buildings.map((b) => b.base.points).flat(),
    ];
    if (points.length === 0) {
      return [];
    }
    const left = Math.min(...points.map((p) => p.x));
    const right = Math.max(...points.map((p) => p.x));
    const top = Math.min(...points.map((p) => p.y));
    const bottom = Math.max(...points.map((p) => p.y));

    const illegalPolys = [
      ...this.buildings.map((b) => b.base),
      ...this.envelopes.map((e) => e.poly),
    ];

    const trees = [];
    let tryCount = 0;
    while (tryCount < 100) {
      const p = new Point(
        lerp(left, right, Math.random()),
        lerp(bottom, top, Math.random()),
      );

      let keep = true;
      let closeToSomething = false;
      for (const poly of illegalPolys) {
        if (
          poly.containsPoint(p) ||
          poly.distanceToPoint(p) < this.treeSize / 2
        ) {
          // check if tree inside or nearby building / road
          keep = false;
          break;
        }
        if (!closeToSomething && poly.distanceToPoint(p) < this.treeSize * 2) {
          // avoiding trees in the middle of nowhere
          closeToSomething = true;
        }
      }

      if (keep) {
        keep = closeToSomething;
      }

      // check if tree too close to other trees
      if (keep) {
        for (const tree of trees) {
          if (distance(tree.center, p) < this.treeSize) {
            keep = false;
          }
        }
      }

      if (keep) {
        trees.push(new Tree(p, this.treeSize));
        tryCount = 0;
      }
      tryCount++;
    }
    return trees;
  }

  #generateBuildings() {
    const tempEnvelopes = [];
    for (const seg of this.graph.segments) {
      tempEnvelopes.push(
        new Envelope(
          seg,
          this.roadWidth + this.buildingWidth + this.spacing * 2,
          this.roadRoundness,
        ),
      );
    }

    const guides = Polygon.union(tempEnvelopes.map((e) => e.poly)).filter(
      (seg) => seg.length() >= this.buildingMinLength,
    );

    const supports = [];
    for (let seg of guides) {
      const len = seg.length() + this.spacing;
      const buildingCount = Math.floor(
        len / (this.buildingMinLength + this.spacing),
      );
      const buildingLength = len / buildingCount - this.spacing;
      const dir = seg.directionVector();

      let q1 = seg.p1;
      let q2 = add(q1, scale(dir, buildingLength));
      supports.push(new Segment(q1, q2));

      for (let i = 2; i <= buildingCount; i++) {
        q1 = add(q2, scale(dir, this.spacing));
        q2 = add(q1, scale(dir, buildingLength));
        supports.push(new Segment(q1, q2));
      }
    }
    const bases = supports.map(
      (seg) => new Envelope(seg, this.buildingWidth).poly,
    );

    const eps = 0.001;
    for (let i = 0; i < bases.length - 1; i++) {
      for (let j = i + 1; j < bases.length; j++) {
        if (
          bases[i].intersectsPoly(bases[j]) ||
          bases[i].distanceToPoly(bases[j]) < this.spacing - eps
        ) {
          bases.splice(j, 1);
          j--;
        }
      }
    }

    return bases.map((b) => new Building(b));
  }

  #getIntersections() {
    const subset = [];
    for (const point of this.graph.points) {
      let degree = 0;
      for (const seg of this.graph.segments) {
        if (seg.includes(point)) {
          degree++;
        }
      }

      if (degree > 2) {
        subset.push(point);
      }
    }
    return subset;
  }

  #updateLights() {
    const lights = this.markings.filter((m) => m instanceof Light);
    const controlCenters = [];
    for (const light of lights) {
      const point = getNearestPoint(light.center, this.#getIntersections());
      if (!point) {
        return;
      }
      let controlCenter = controlCenters.find((c) => c.equals(point));
      if (!controlCenter) {
        controlCenter = new Point(point.x, point.y);
        controlCenter.lights = [light];
        controlCenters.push(controlCenter);
      } else {
        controlCenter.lights.push(light);
      }
    }
    const greenDuration = 2,
      yellowDuration = 1;
    for (const center of controlCenters) {
      center.ticks = center.lights.length * (greenDuration + yellowDuration);
    }
    const tick = Math.floor(this.frameCount / 60);
    for (const center of controlCenters) {
      const cTick = tick % center.ticks;
      const greenYellowIndex = Math.floor(
        cTick / (greenDuration + yellowDuration),
      );
      const greenYellowState =
        cTick % (greenDuration + yellowDuration) < greenDuration
          ? 'green'
          : 'yellow';
      for (let i = 0; i < center.lights.length; i++) {
        if (i === greenYellowIndex) {
          center.lights[i].state = greenYellowState;
        } else {
          center.lights[i].state = 'red';
        }
      }
    }
    this.frameCount++;
  }

  draw(ctx, viewPoint, showStartMarkings = true, renderRadius = 1000) {
    this.#updateLights();

    for (const env of this.envelopes) {
      env.draw(ctx, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
    }
    for (const marking of this.markings) {
      if (!(marking instanceof Start) || showStartMarkings) {
        marking.draw(ctx);
      }
    }
    for (const seg of this.graph.segments) {
      seg.draw(ctx, { color: 'white', width: 4, dash: [10, 10] });
    }
    for (const seg of this.roadBorders) {
      seg.draw(ctx, { color: 'white', width: 4 });
    }
    ctx.globalAlpha = 0.2;
    for (const car of this.cars) {
      car.draw(ctx);
    }
    ctx.globalAlpha = 1;
    if (this.bestCar) {
      this.bestCar.draw(ctx);
    }

    const items = [...this.buildings, ...this.trees].filter(
      (i) => i.base.distanceToPoint(viewPoint) < renderRadius,
    );
    items.sort(
      (a, b) =>
        b.base.distanceToPoint(viewPoint) - a.base.distanceToPoint(viewPoint),
    );
    for (const item of items) {
      item.draw(ctx, viewPoint);
    }
  }
}
