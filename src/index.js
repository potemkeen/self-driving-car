import { Car } from './car';
import { Road } from './road';
import { Visualizer } from './visualizier';
import { NeuralNetwork } from './network';
import { getRandomColor } from './utils';
import initBrain from './brain.json';

const LANE_WIDTH = 60;
const LANES = 3;
const WIDTH = LANE_WIDTH * LANES;
const BRAIN_LS_KEY = 'brain';
const VISITED_LS_KEY = 'visited-before';

const visitedBefore = localStorage.getItem(VISITED_LS_KEY);
if (!visitedBefore) {
  localStorage.setItem(VISITED_LS_KEY, true.toString());
  if (!localStorage.getItem(BRAIN_LS_KEY)) {
    localStorage.setItem(BRAIN_LS_KEY, JSON.stringify(initBrain));
  }
}

const carCanvas = document.getElementById('car-canvas');
carCanvas.height = window.innerHeight;
carCanvas.width = WIDTH;

const networkCanvas = document.getElementById('network-canvas');
networkCanvas.height = window.innerHeight;
networkCanvas.width = 500;

const saveButton = document.getElementById('save');
const discardButton = document.getElementById('discard');
const restartButton = document.getElementById('restart');
const mutationAmountSelect = document.getElementById('mutation-amount');
const carCountSelect = document.getElementById('car-count');
const trafficRowsCountSelect = document.getElementById('traffic-rows-count');
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
trafficRowsCountSelect.addEventListener('change', (e) => {
  trafficRows = e.target.value;
});
fastForwardMultiplierSelect.addEventListener('change', (e) => {
  fastForwardMultiplier = e.target.value;
});

window.onresize = () => {
  carCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;
};

const carCtx = carCanvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, LANES);

let fastForwardMultiplier = 1;
let mutationAmount = 0.1;

let carCount = 100;
let cars = [];
let bestCar;

let trafficRows = 10;
let traffic = [];

let isStarted = false;

start();

function save() {
  localStorage.setItem(BRAIN_LS_KEY, JSON.stringify(bestCar.brain));
}

function discard() {
  localStorage.removeItem(BRAIN_LS_KEY);
}

function start() {
  isStarted = true;
  cars = generateCars(carCount);
  bestCar = cars[0];
  cars[0].color = 'yellow';
  const brainJSON = localStorage.getItem(BRAIN_LS_KEY);
  if (brainJSON) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].brain = JSON.parse(brainJSON);
      if (i !== 0) {
        NeuralNetwork.mutate(cars[i].brain, mutationAmount);
      }
    }
  }
  traffic = generateTraffic(trafficRows);
  requestAnimationFrame(animate);
}

function restart() {
  isStarted = false;
  requestAnimationFrame(start);
}

function generateTraffic(n) {
  const traffic = [];
  for (let i = 0; i < n; i++) {
    const emptyLane = Math.floor(Math.random() * LANES);
    for (let j = 0; j < LANES; j++) {
      if (j !== emptyLane) {
        traffic.push(
          new Car(
            road.getLaneCenter(j),
            -200 * i,
            30,
            50,
            'DUMMY',
            2,
            getRandomColor(),
          ),
        );
      }
    }
  }

  return traffic;
}

function generateCars(n) {
  const cars = [];
  for (let i = 1; i <= n; i++) {
    cars.push(new Car(road.getLaneCenter(1), 150, 30, 50, 'AI', 3, 'blue'));
  }

  return cars;
}

function fitnessFunc(bestCar, car) {
  if (car.trafficPassed > bestCar.trafficPassed) {
    return car;
  }
  if (car.trafficPassed === bestCar.trafficPassed && car.y < bestCar.y) {
    return car;
  }
  return bestCar;
}

function update() {
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders, traffic);
  }
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(road.borders, traffic);
  }
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].handleCollision(road.borders, traffic);
  }
  for (let i = 0; i < cars.length; i++) {
    cars[i].handleCollision(road.borders, traffic);
  }

  bestCar = cars.reduce(fitnessFunc);
}

function draw(time) {
  carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
  carCtx.save();
  carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);
  road.draw(carCtx);
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(carCtx);
  }
  carCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    cars[i].draw(carCtx);
  }
  carCtx.globalAlpha = 1;
  bestCar.draw(carCtx, true);

  carCtx.restore();

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
