import { Point } from '../primitives/point';
import { degToRad, invLerp } from './utils';
import { Segment } from '../primitives/segment';
import { Building } from '../items/building';
import { Polygon } from '../primitives/polygon';

export const Osm = {
  parse(data) {
    const nodes = data.elements.filter((n) => n.type === 'node');
    const lats = nodes.map((n) => n.lat);
    const lons = nodes.map((n) => n.lon);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const deltaLat = maxLat - minLat;
    const deltaLon = maxLon - minLon;
    const ar = deltaLon / deltaLat;
    const height = deltaLat * 111000 * 10;
    const width = height * ar * Math.cos(degToRad(maxLat));

    const center = new Point( width / 2, height / 2 );

    const points = [];
    const segments = [];
    const buildings = [];

    const highways = [];
    const buildingsWays = [];
    for (const el of data.elements) {
      if (el.type === 'way') {
        if (el.tags.building) {
          buildingsWays.push(el);
        } else {
          highways.push(el);
        }
      }
    }
    for (const node of nodes) {
      if (highways.some((highway) => highway.nodes.includes(node.id))) {
        const y = invLerp(maxLat, minLat, node.lat) * height;
        const x = invLerp(minLon, maxLon, node.lon) * width;
        points.push(new Point(x, y, node.id));
      }
    }

    for (const way of highways) {
      const ids = way.nodes;
      let prev = points.find((p) => p.id === ids[0]);
      for (let i = 1; i < ids.length; i++) {
        const curr = points.find((p) => p.id === ids[i]);
        const oneWay = way.tags.oneway === 'yes' || way.tags.lanes === 1;
        segments.push(new Segment(prev, curr, oneWay));
        prev = curr;
      }
    }

    for (const way of buildingsWays) {
      const points = way.nodes.map((id) => {
        const node = nodes.find((n) => n.id === id);
        const y = invLerp(maxLat, minLat, node.lat) * height;
        const x = invLerp(minLon, maxLon, node.lon) * width;
        return new Point(x, y, node.id);
      });
      const levels = way.tags['building:levels'] ?? 1;
      const base = new Polygon(points);
      buildings.push(new Building(base, 25 + 50 * levels));
    }

    return { points, segments, buildings, center };
  },
};

