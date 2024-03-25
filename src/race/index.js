import { Car } from '../car';
import { NeuralNetwork } from '../network';
import initWorld from '../saves/init.world';
import rightHandRuleCar from '../saves/right_hand_rule.car';
import { World } from '../world/world';
import { Graph } from '../world/math/graph';
import { Viewport } from '../world/viewport';
import { angle, getNearestSegment, scale } from '../world/math/utils';
import { Start } from '../world/markings/start';
import { Point } from '../world/primitives/point';
import { Minimap } from '../minimap';
import { Target } from '../world/markings/target';
import { getRandomColor } from '../utils';
import { Segment } from '../world/primitives/segment';

const BRAIN_LS_KEY = 'brain';
const WORLD_LS_KEY = 'world';
const VISITED_LS_KEY = 'visited-before';
const ROWS_IN_STAT = 10;
const rightPanelSize = 260;

const visitedBefore = localStorage.getItem(VISITED_LS_KEY);
if (!visitedBefore) {
  localStorage.setItem(VISITED_LS_KEY, true.toString());
  if (!localStorage.getItem(WORLD_LS_KEY)) {
    localStorage.setItem(WORLD_LS_KEY, initWorld);
  }
}

const minimapCanvas = document.getElementById('minimap-canvas');
minimapCanvas.width = rightPanelSize;
minimapCanvas.height = rightPanelSize;

const statistics = document.getElementById('statistics');
statistics.style.width = `${rightPanelSize}px`;
statistics.style.height = `${window.innerHeight - rightPanelSize - 50}px`;

const counter = document.getElementById('counter');

const carCanvas = document.getElementById('car-canvas');
carCanvas.height = window.innerHeight;
carCanvas.width = window.innerWidth;

const carCtx = carCanvas.getContext('2d');

const worldString = localStorage.getItem(WORLD_LS_KEY);
const worldInfo = worldString ? JSON.parse(worldString) : null;
let world = worldInfo ? World.load(worldInfo) : new World(new Graph());
const viewport = new Viewport(carCanvas, world.zoom, world.offset);
const minimap = new Minimap(minimapCanvas, world.graph, rightPanelSize);
let roadBorders = world.roadBorders;
window.world = world;

let carCount = 50;
let mutationAmount = 0.05;

window.onresize = () => {
  carCanvas.width = window.innerWidth;
  carCanvas.height = window.innerHeight;
  viewport.center.x = carCanvas.width / 2;
  viewport.center.y = carCanvas.height / 2;
};

let isStarted = false;
let totalDistance = 0;
let frameCount = 0;

world.cars = generateCars(1, 'KEYS').concat(generateCars(carCount, 'AI'));
world.bestCar = world.cars[0];

const brainJSON =
  localStorage.getItem(BRAIN_LS_KEY) || JSON.stringify(world.bestCar.brain);

if (brainJSON) {
  for (let i = 1; i < world.cars.length; i++) {
    const car = world.cars[i];
    car.brain = JSON.parse(brainJSON);
    if (i > 1) {
      NeuralNetwork.mutate(car.brain, mutationAmount);
    }
  }
}

const target = world.markings.find((m) => m instanceof Target);
if (target) {
  world.generateCorridor(world.bestCar, target.center, true);
  roadBorders = world.corridor.borders;
  totalDistance = world.corridor.skeleton.reduce(
    (acc, s) => acc + s.length(),
    0,
  );
}
for (let i = 0; i < 10; i++) {
  const div = document.createElement('div');
  div.id = `stat_${i}`;
  div.innerText = i;
  div.style.color = world.cars[i].color;
  div.classList.add('stat');
  statistics.appendChild(div);
}
requestAnimationFrame(animate);
startCounter();

function start() {
  isStarted = true;
  frameCount = 0;
}

function generateCars(n, type = 'AI') {
  const startPoints = world.markings.filter((m) => m instanceof Start);
  const startPoint =
    startPoints.length > 0 ? startPoints[0].center : new Point(100, 100);
  const dir =
    startPoints.length > 0 ? startPoints[0].directionVector : new Point(0, -1);
  const startAngle = -angle(dir) + Math.PI / 2;
  const cars = [];
  for (let i = 1; i <= n; i++) {
    const color = type === 'AI' ? getRandomColor() : 'blue';
    const car = new Car(
      startPoint.x,
      startPoint.y,
      30,
      50,
      type,
      startAngle,
      3,
      color,
    );
    car.name = type === 'AI' ? `AI-${i}` : 'Me';
    car.load(JSON.parse(rightHandRuleCar));
    cars.push(car);
  }

  return cars;
}

function update() {
  for (const car of world.cars) {
    car.update(roadBorders, []);
    updateCarProgress(car);
  }
  world.cars.sort((a, b) => b.progress - a.progress);
}

let lastCalledTime = performance.now();
let fps = 0;

function draw() {
  carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
  viewport.offset.x = -world.bestCar.x;
  viewport.offset.y = -world.bestCar.y;

  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  const renderRadius =
    (Math.hypot(carCanvas.width, carCanvas.height) / 2) * viewport.zoom;
  world.draw(carCtx, viewPoint, false, renderRadius);
  minimap.update(viewPoint, world.bestCar, world.cars);

  const delta = (performance.now() - lastCalledTime) / 1000;
  lastCalledTime = performance.now();
  fps = Math.floor(1 / delta);
  carCtx.beginPath();
  carCtx.textBaseline = 'middle';
  carCtx.textAlign = 'center';
  carCtx.fillStyle = 'black';
  carCtx.font = `bold ${24 * viewport.zoom}px Arial`;
  carCtx.fillText(
    fps,
    viewPoint.x + (carCanvas.width / 2 - 20) * viewport.zoom,
    viewPoint.y - (carCanvas.height / 2 - 20) * viewport.zoom,
  );
  const myIndex = world.cars.findIndex((car) => car === world.bestCar);
  let count = ROWS_IN_STAT;
  if (myIndex > ROWS_IN_STAT - 1) {
    const myCar = world.bestCar;
    const penultStat = document.getElementById(`stat_${ROWS_IN_STAT - 2}`);
    penultStat.style.color = 'white';
    penultStat.innerText = '...';
    const lastStat = document.getElementById(`stat_${ROWS_IN_STAT - 1}`);
    lastStat.innerHTML = `<span>${myIndex + 1}: ${myCar.name} ${myCar.damaged ? '💀' : ''}</span>`;
    lastStat.style.backgroundColor = 'white';
    if (myCar.finishTime) {
      lastStat.innerHTML += `<span>${(myCar.finishTime / 60).toFixed(1)}s</span>`;
    }
    count = 8;
  }
  for (let i = 0; i < count; i++) {
    const car = world.cars[i];
    const stat = document.getElementById(`stat_${i}`);
    stat.style.color = car.color;
    stat.innerHTML = `<span>${i + 1}: ${car.name} ${car.damaged ? '💀' : ''}</span>`;
    stat.style.backgroundColor = car.type === 'AI' ? 'black' : 'white';
    if (car.finishTime) {
      stat.innerHTML += `<span>${(car.finishTime / 60).toFixed(1)}s</span>`;
    }
  }

  frameCount++;
}

function updateCarProgress(car) {
  if (!car.finishTime) {
    let distance = 0;
    const carSeg = getNearestSegment(car, world.corridor.skeleton);
    for (const seg of world.corridor.skeleton) {
      if (seg.equals(carSeg)) {
        const proj = seg.projectPoint(car);
        const firstPartOfSegment = new Segment(seg.p1, proj.point);
        distance += firstPartOfSegment.length();
        break;
      } else {
        distance += seg.length();
      }
    }
    car.progress = distance / totalDistance;
    if (car.progress >= 1) {
      car.progress = 1;
      car.finishTime = frameCount;
    }
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function startCounter() {
  for (let i = 3; i >= 0; i--) {
    counter.innerText = i > 0 ? i : 'GO';
    await wait(1000);
  }
  counter.innerText = '';
  start();
}

function animate(time) {
    if (isStarted) {
      update();
    }
    draw(time);
    requestAnimationFrame(animate);
}
