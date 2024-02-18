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
    const point = new Point(info.center.x, info.center.y);
    const dir = new Point(info.directionVector.x, info.directionVector.y);
    const {width, height} = info;
    switch (info.type) {
        case 'crossing':
            return new Crossing(point, dir, width, height);
        case 'light':
            return new Light(point, dir, width, height);
        case 'marking':
            return new Marking(point, dir, width, height);
        case 'parking':
            return new Parking(point, dir, width, height);
        case 'start':
            return new Start(point, dir, width, height);
        case 'stop':
            return new Stop(point, dir, width, height);
        case 'target':
            return new Target(point, dir, width, height);
        case 'yield':
            return new Yield(point, dir, width, height);
    }
}
