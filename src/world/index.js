import { Graph } from './math/graph';
import { GraphEditor } from './editors/graph-editor';
import { Viewport } from './viewport';
import { scale } from './math/utils';
import { StopEditor } from './editors/stop-editor';
import { CrossingEditor } from './editors/crossing-editor';
import { StartEditor } from './editors/start-editor';
import { YieldEditor } from './editors/yield-editor';
import { ParkingEditor } from './editors/parking-editor';
import { TargetEditor } from './editors/target-editor';
import { LightEditor } from './editors/light-editor';
import { World } from './world';
import { Osm } from './math/osm';
import { BuildingEditor } from './editors/building-editor';

const editors = {
  graph: GraphEditor,
  stop: StopEditor,
  crossing: CrossingEditor,
  parking: ParkingEditor,
  start: StartEditor,
  light: LightEditor,
  yield: YieldEditor,
  target: TargetEditor,
  building: BuildingEditor,
};

const canvas = document.getElementById('canvas');
const disposeBtn = document.getElementById('dispose');
const saveBtn = document.getElementById('save');
const fileInput = document.getElementById('file-input');
const osmBtn = document.getElementById('osm');
const osmPanel = document.getElementById('osm-panel');
const osmCloseBtn = document.getElementById('osm-close');
const osmParseBtn = document.getElementById('osm-parse');
const osmDataContainer = document.getElementById('osm-data-container');

disposeBtn.addEventListener('click', dispose);
saveBtn.addEventListener('click', save);
fileInput.addEventListener('change', load);
osmBtn.addEventListener('click', openOsmPanel);
osmCloseBtn.addEventListener('click', closeOsmPanel);
osmParseBtn.addEventListener('click', parseOsmData);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d');

const worldString = localStorage.getItem('world');
const worldInfo = worldString ? JSON.parse(worldString) : null;
let world = worldInfo ? World.load(worldInfo) : new World(new Graph());
window.world = world;
const graph = world.graph;

const viewport = new Viewport(canvas, world.zoom, world.offset);

const tools = {};
for (const title in editors) {
  const btn = document.getElementById(title);
  btn.addEventListener('click', () => setMode(title));
  const Editor = editors[title];
  let data = world;
  if (title === 'graph') {
    data = graph;
  }
  if (title === 'building') {
    data = world.buildings;
  }
  tools[title] = { button: btn, editor: new Editor(viewport, data) };
}

let oldGraphHash = graph.hash();

disableEditors();
if (world.graph.points.length === 0) {
  // enable graph editor if world is empty
  setMode('graph');
}

window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  viewport.center.x = canvas.width / 2;
  viewport.center.y = canvas.height / 2;
};

animate();

function animate() {
  viewport.reset();
  if (graph.hash() !== oldGraphHash) {
    world.generate();
    oldGraphHash = graph.hash();
  }
  const viewPoint = scale(viewport.getOffset(), -1);
  const renderRadius =
    (Math.hypot(canvas.width, canvas.height) / 2) * viewport.zoom;
  world.draw(ctx, viewPoint, true, renderRadius);
  ctx.globalAlpha = 0.3;
  for (const tool of Object.values(tools)) {
    tool.editor.display();
  }
  requestAnimationFrame(animate);
}

function dispose() {
  tools.graph && tools.graph.editor.dispose();
  world.buildings.length = 0;
  world.markings.length = 0;
  setMode('graph');
}

function load() {
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
    localStorage.setItem('world', JSON.stringify(world));
    location.reload();
  };
}

function save() {
  world.zoom = viewport.zoom;
  world.offset = viewport.offset;

  const element = document.createElement('a');
  element.setAttribute(
    'href',
    `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(world))}`,
  );
  const fileName = `${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, '')
    .replace(/\./g, '')}.world`;
  element.setAttribute('download', fileName);
  element.click();

  localStorage.setItem('world', JSON.stringify(world));
}

function setMode(mode) {
  disableEditors();
  tools[mode].button.classList.remove('off');
  tools[mode].editor.enable();
}

function disableEditors() {
  for (const tool of Object.values(tools)) {
    tool.editor.disable();
    tool.button.classList.add('off');
  }
}

function openOsmPanel() {
  osmPanel.style.display = 'flex';
}

function closeOsmPanel() {
  osmPanel.style.display = 'none';
}

function parseOsmData() {
  if (osmDataContainer.value === '') {
    alert('Paste data first!');
    return;
  }
  dispose();
  const res = Osm.parse(JSON.parse(osmDataContainer.value));
  graph.points = res.points;
  graph.segments = res.segments;
  world.buildings = res.buildings;
  viewport.offset = scale(res.center, -1);
  closeOsmPanel();
}
