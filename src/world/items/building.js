import { getFake3dPoint } from '../math/utils';
import { Polygon } from '../primitives/polygon';

export class Building {
    constructor(poly, height = 300) {
        this.base = poly;
        this.height = height;
    }

    static load(info) {
        return new Building(Polygon.load(info.b), info.h);
    }

    toJSON() {
        return { b: this.base, h: this.height };
    }

    draw(ctx, viewPoint, { color = 'white' } = {}) {
        const topPoints = this.base.points.map((p) =>
            getFake3dPoint(p, viewPoint, this.height * 0.6)
        );
        const ceiling = new Polygon(topPoints);

        const sides = [];
        for (let i = 0; i < this.base.points.length; i++) {
            const nextI = (i + 1) % this.base.points.length;
            const poly = new Polygon([
                this.base.points[i], this.base.points[nextI],
                topPoints[nextI], topPoints[i],
            ]);
            sides.push(poly);
        }

        sides.sort((a, b) => b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint));

        // const baseMidpoints = [
        //     average(this.base.points[0], this.base.points[1]),
        //     average(this.base.points[2], this.base.points[3])
        // ];

        // const topMidpoints = baseMidpoints.map((p) =>
        //     getFake3dPoint(p, viewPoint, this.height)
        // );

        // const roofPolys = [
        //     new Polygon([
        //         ceiling.points[0], ceiling.points[3],
        //         topMidpoints[1], topMidpoints[0]
        //     ]),
        //     new Polygon([
        //         ceiling.points[2], ceiling.points[1],
        //         topMidpoints[0], topMidpoints[1]
        //     ])
        // ];
        // roofPolys.sort(
        //     (a, b) =>
        //         b.distanceToPoint(viewPoint) -
        //         a.distanceToPoint(viewPoint)
        // );

        this.base.draw(ctx, {fill: color, stroke: 'rgba(0,0,0,0.2)', lineWidth: 20});
        for (const side of sides) {
            side.draw(ctx, {fill: color, stroke: '#F2F2F2'});
        }
        ceiling.draw(ctx, {fill: '#DDD', stroke: 'white', lineWidth: 6});
        // for (const poly of roofPolys) {
        //     poly.draw(ctx, {fill: '#D44', stroke: '#C44', lineWidth: 8, join: 'round'});
        // }
    }
}
