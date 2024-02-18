import { Car } from './car';
import { Visualizer } from './visualizier';
import { NeuralNetwork } from './network';
import initBrain from './brain.json';
import initWorld from './world.json';
import { World } from './world/world';
import { Graph } from './world/math/graph';
import { Viewport } from './world/viewport';
import { angle, scale } from './world/math/utils';
import { Start } from './world/markings/start';
import { Point } from './world/primitives/point';
import { Minimap } from './minimap';

const BRAIN_LS_KEY = 'brain';
const WORLD_LS_KEY = 'world';
const VISITED_LS_KEY = 'visited-before';

const visitedBefore = localStorage.getItem(VISITED_LS_KEY);
if (!visitedBefore) {
  localStorage.setItem(VISITED_LS_KEY, true.toString());
  if (!localStorage.getItem(BRAIN_LS_KEY)) {
    localStorage.setItem(BRAIN_LS_KEY, JSON.stringify(initBrain));
  }
  if (!localStorage.getItem(WORLD_LS_KEY)) {
    localStorage.setItem(WORLD_LS_KEY, JSON.stringify(initWorld));
  }
}

const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', loadWorld);

const buttonsContainer = document.getElementById('buttons');

const minimapCanvas = document.getElementById('minimap-canvas');
minimapCanvas.width = 300;
minimapCanvas.height = 300;

const networkCanvas = document.getElementById('network-canvas');
networkCanvas.height = window.innerHeight - minimapCanvas.height;
networkCanvas.width = 300;

const carCanvas = document.getElementById('car-canvas');
carCanvas.height = window.innerHeight;
carCanvas.width = window.innerWidth - buttonsContainer.clientWidth - networkCanvas.width;

const saveButton = document.getElementById('save');
const discardButton = document.getElementById('discard');
const restartButton = document.getElementById('restart');
const mutationAmountSelect = document.getElementById('mutation-amount');
const carCountSelect = document.getElementById('car-count');
const fastForwardMultiplierSelect = document.getElementById(
  'fast-forward-multiplier',
);

saveButton.addEventListener('click', save);
discardButton.addEventListener('click', discard);
restartButton.addEventListener('click', restart);
mutationAmountSelect.addEventListener('change', (e) => {
  mutationAmount = e.target.value;
});
carCountSelect.addEventListener('change', (e) => {
  carCount = e.target.value;
});
fastForwardMultiplierSelect.addEventListener('change', (e) => {
  fastForwardMultiplier = e.target.value;
});

const carCtx = carCanvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');

const worldString = localStorage.getItem(WORLD_LS_KEY);
const worldInfo = worldString ? JSON.parse(worldString) : null;
let world = worldInfo ? World.load(worldInfo) : new World(new Graph());
const viewport = new Viewport(carCanvas, world.zoom, world.offset);
const minimap = new Minimap(minimapCanvas, world.graph, 300);

let fastForwardMultiplier = 1;
let mutationAmount = 0.1;

let carCount = 100;
let cars = [];
const roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);
let bestCar;

let isStarted = false;

window.onresize = () => {
  carCanvas.width = window.innerWidth - buttonsContainer.clientWidth - networkCanvas.width;
  carCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight - minimapCanvas.height;
  viewport.center.x = carCanvas.width / 2;
  viewport.center.y = carCanvas.height / 2;
};

start();

function save() {
  localStorage.setItem(BRAIN_LS_KEY, JSON.stringify(bestCar.brain));
}

function discard() {
  localStorage.removeItem(BRAIN_LS_KEY);
}

function loadWorld() {
  const file = event.target.files[0];

  if (!file) {
    alert('No file selected!');
    return;
  }

  const reader = new FileReader();
  reader.readAsText(file);

  reader.onload = (event) => {
    const fileContent = event.target.result;
    const jsonData = JSON.parse(fileContent);
    world = World.load(jsonData);
    localStorage.setItem(WORLD_LS_KEY, JSON.stringify(world));
    location.reload();
  }
}

function start() {
  isStarted = true;
  cars = generateCars(carCount);
  bestCar = cars[0];
  const brainJSON = localStorage.getItem(BRAIN_LS_KEY);
  if (brainJSON) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].brain = JSON.parse(brainJSON);
      if (i !== 0) {
        NeuralNetwork.mutate(cars[i].brain, mutationAmount);
      }
    }
  }
  requestAnimationFrame(animate);
}

function restart() {
  isStarted = false;
  requestAnimationFrame(start);
}

function generateCars(n) {
  const startPoints = world.markings.filter((m) => m instanceof Start);
  const startPoint = startPoints.length > 0
      ? startPoints[0].center
      : new Point(100, 100);
  const dir = startPoints.length > 0
      ? startPoints[0].directionVector
      : new Point(0, -1);
  const startAngle = -angle(dir) + Math.PI / 2;
  const cars = [];
  for (let i = 1; i <= n; i++) {
    cars.push(new Car(startPoint.x, startPoint.y, 30, 50, 'AI', startAngle, 3, 'blue'));
  }

  return cars;
}

function fitnessFunc(bestCar, car) {
  return car.fittness > bestCar.fittness ? car : bestCar;
}

function update() {
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(roadBorders, []);
  }

  bestCar = cars.reduce(fitnessFunc);
  world.cars = cars;
  world.bestCar = bestCar;
}

function draw(time) {
  carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
  viewport.offset.x = -bestCar.x;
  viewport.offset.y = -bestCar.y;

  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  const renderRadius = Math.hypot(carCanvas.width, carCanvas.height)/2 * viewport.zoom;
  world.draw(carCtx, viewPoint, false, renderRadius);
  carCtx.beginPath();
  carCtx.strokeStyle = 'red';
  carCtx.arc(viewPoint.x, viewPoint.y, renderRadius, 0, Math.PI * 2);
  carCtx.stroke();
  minimap.update(viewPoint)

  networkCtx.rect(0, 0, networkCanvas.width, networkCanvas.height);
  networkCtx.fillStyle = 'black';
  networkCtx.fill();
  networkCtx.lineDashOffset = -time / 50;
  Visualizer.drawNetwork(networkCtx, bestCar.brain);
}

function animate(time) {
  for (let i = 0; i < fastForwardMultiplier; i++) {
    update();
  }

  draw(time);

  if (isStarted) {
    requestAnimationFrame(animate);
  }
}
