import { Crossing } from './crossing';
import { Light } from './light';
import { Marking } from './marking';
import { Parking } from './parking';
import { Start } from './start';
import { Target } from './target';
import { Yield } from './yield';
import { Point } from '../primitives/point';
import { Stop } from './stop';

export function createMarking(info) {
    const point = new Point(info.c.x, info.c.y);
    const dir = new Point(info.dv.x, info.dv.y);
    const {w, h} = info;
    switch (info.t) {
        case 'crossing':
            return new Crossing(point, dir, w, h);
        case 'light':
            return new Light(point, dir, w, h);
        case 'marking':
            return new Marking(point, dir, w, h);
        case 'parking':
            return new Parking(point, dir, w, h);
        case 'start':
            return new Start(point, dir, w, h);
        case 'stop':
            return new Stop(point, dir, w, h);
        case 'target':
            return new Target(point, dir, w, h);
        case 'yield':
            return new Yield(point, dir, w, h);
    }
}
