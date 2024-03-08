import { Point } from '../primitives/point';
import { Segment } from '../primitives/segment';

export class Graph {
  constructor(points = [], segments = []) {
    this.points = points;
    this.segments = segments;
  }

  static load(info) {
    const points = info.points.map((p) => new Point(p.x, p.y));
    const segments = info.segments.map((seg) => Segment.load(seg, points));

    return new Graph(points, segments);
  }

  hash() {
    return JSON.stringify(this);
  }

  addPoint(point) {
    this.points.push(point);
  }

  containsPoint(point) {
    return this.points.some((p) => p.equals(point));
  }

  tryAddPoint(point) {
    if (!this.containsPoint(point)) {
      this.addPoint(point);
      return true;
    }
    return false;
  }

  removePoint(point) {
    const segs = this.getSegmentsWithPoint(point);
    for (const seg of segs) {
      this.removeSegment(seg);
    }
    this.points.splice(this.points.indexOf(point), 1);
  }

  addSegment(seg) {
    this.segments.push(seg);
  }

  containsSegment(seg) {
    return this.segments.some((s) => s.equals(seg));
  }

  tryAddSegment(seg) {
    if (!this.containsSegment(seg) && !seg.p1.equals(seg.p2)) {
      this.addSegment(seg);
      return true;
    }
    return false;
  }

  removeSegment(seg) {
    this.segments.splice(this.segments.indexOf(seg), 1);
  }

  getSegmentsWithPoint(point) {
    return this.segments.filter((seg) => seg.includes(point));
  }

  getSegmentsLeavingFromPoint(point) {
    return this.segments.filter((seg) =>
      seg.oneWay ? seg.p1.equals(point) : seg.includes(point),
    );
  }

  getShortestPath(start, end) {
    if (!start || !end) {
      return [];
    }
    for (const point of this.points) {
      point.dist = Number.MAX_SAFE_INTEGER;
      point.visited = false;
    }

    let currentPoint = start;
    currentPoint.dist = 0;

    while (!end.visited) {
      const segs = this.getSegmentsLeavingFromPoint(currentPoint);
      for (const seg of segs) {
        const otherPoint = seg.p1.equals(currentPoint) ? seg.p2 : seg.p1;
        if (currentPoint.dist + seg.length() < otherPoint.dist) {
          otherPoint.dist = currentPoint.dist + seg.length();
          otherPoint.prev = currentPoint;
        }
      }
      currentPoint.visited = true;

      let unvisited = this.points.filter((p) => p.visited === false);
      currentPoint = unvisited.reduce(
        (min, p) => (p.dist < min.dist ? p : min),
        unvisited[0],
      );
    }

    const path = [];
    currentPoint = end;
    while (currentPoint) {
      path.unshift(currentPoint);
      currentPoint = currentPoint.prev;
    }

    for (const point of this.points) {
      delete point.dist;
      delete point.visited;
      delete point.prev;
    }

    return path;
  }

  dispose() {
    this.points.length = 0;
    this.segments.length = 0;
  }

  draw(ctx) {
    for (const seg of this.segments) {
      seg.draw(ctx);
    }

    for (const point of this.points) {
      point.draw(ctx);
    }
  }
}
