import * as THREE from 'three';
import { OrbitControls } from
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS2DRenderer.js';

const viewer = document.getElementById('solar-viewer');
const loadingMessage = document.getElementById('loading-message');
const errorMessage = document.getElementById('viewer-error');
const tooltip = document.getElementById('planet-tooltip');
const tooltipName = document.getElementById('tooltip-name');
const tooltipDescription = document.getElementById('tooltip-description');
const tooltipLink = document.getElementById('tooltip-link');

const toggleOrbitsButton = document.getElementById('toggle-orbits');
const resetViewButton = document.getElementById('reset-view');
const closeTooltipButton = document.getElementById('tooltip-close');

const worlds = [
  {
    name: 'Mercury',
    file: 'mercury.html',
    description: 'The smallest planet, orbiting closest to the Sun.',
    radius: 0.75,
    distance: 10,
    speed: 0.48,
    color: '#a8a29e',
    type: 'rocky'
  },
  {
    name: 'Venus',
    file: 'venus.html',
    description: 'A rocky world with a dense atmosphere and extreme heat.',
    radius: 1.05,
    distance: 14,
    speed: 0.35,
    color: '#e8bd86',
    type: 'cloud'
  },
  {
    name: 'Earth',
    file: 'earth.html',
    description: 'Our home, with liquid water on its surface and known life.',
    radius: 1.12,
    distance: 19,
    speed: 0.27,
    color: '#438be8',
    type: 'earth'
  },
  {
    name: 'Mars',
    file: 'mars.html',
    description: 'The red planet, home to enormous volcanoes and ancient valleys.',
    radius: 0.9,
    distance: 24,
    speed: 0.21,
    color: '#d76b4b',
    type: 'mars'
  },
  {
    name: 'Jupiter',
    file: 'jupiter.html',
    description: 'The largest planet, known for its giant storms and cloud bands.',
    radius: 2.6,
    distance: 33,
    speed: 0.13,
    color: '#d4ad88',
    type: 'gas'
  },
  {
    name: 'Saturn',
    file: 'saturn.html',
    description: 'A gas giant surrounded by a spectacular system of icy rings.',
    radius: 2.15,
    distance: 43,
    speed: 0.095,
    color: '#d9c18c',
    type: 'gas',
    rings: true
  },
  {
    name: 'Uranus',
    file: 'uranus.html',
    description: 'A pale blue ice giant that rotates at an unusual angle.',
    radius: 1.55,
    distance: 53,
    speed: 0.07,
    color: '#87d9e5',
    type: 'ice'
  },
  {
    name: 'Neptune',
    file: 'neptune.html',
    description: 'A distant blue ice giant with extremely powerful winds.',
    radius: 1.5,
    distance: 62,
    speed: 0.055,
    color: '#426ee9',
    type: 'ice'
  }
];

let scene;
let camera;
let renderer;
let labelRenderer; // draws the planet name labels (HTML text over the 3D scene)
let controls;
let sun;
let sunGlow;
let orbitLines = [];
let planetMeshes = [];
let clickableObjects = [];
let orbitsVisible = true;
let animationFrame = 0;
let lastTime = 0;
let elapsed = 0;
let selectedPlanet = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let pointerStart = null;

function createTexture(baseColor, type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;

  const context = canvas.getContext('2d');

  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (type === 'gas' || type === 'cloud') {
    const colors = type === 'gas'
      ? ['#ead2aa', '#bd8e68', '#f1dfc4', '#9b7057', '#d6b18b']
      : ['#f5d8a9', '#d9b17a', '#f9e7c5', '#c99c69'];

    for (let i = 0; i < 45; i++) {
      const y = Math.random() * canvas.height;
      const h = 2 + Math.random() * 13;
      context.globalAlpha = 0.12 + Math.random() * 0.3;
      context.fillStyle = colors[i % colors.length];
      context.fillRect(0, y, canvas.width, h);
    }

    context.globalAlpha = 1;

    if (type === 'gas') {
      context.fillStyle = 'rgba(120, 65, 40, 0.7)';
      context.beginPath();
      context.ellipse(330, 145, 35, 14, -0.12, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = 'rgba(255, 231, 198, 0.7)';
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(330, 145, 37, 15, -0.12, 0, Math.PI * 2);
      context.stroke();
    }
  }

  if (type === 'earth') {
    context.fillStyle = '#3b9b67';

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const rx = 8 + Math.random() * 35;
      const ry = 5 + Math.random() * 18;

      context.beginPath();
      context.ellipse(x, y, rx, ry, Math.random(), 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = 'rgba(240, 248, 255, 0.55)';

    for (let i = 0; i < 45; i++) {
      context.beginPath();
      context.ellipse(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        3 + Math.random() * 12,
        1 + Math.random() * 4,
        Math.random(),
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }

  if (type === 'mars') {
    for (let i = 0; i < 100; i++) {
      context.fillStyle = i % 2 === 0
        ? 'rgba(90, 30, 20, 0.2)'
        : 'rgba(255, 190, 130, 0.2)';

      context.beginPath();
      context.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1 + Math.random() * 8,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStars() {
  const starCount = 3000;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 700;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 450;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 700;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0xdce8ff,
    size: 0.38,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true
  });

  scene.add(new THREE.Points(geometry, material));
}

// Creates an HTML text label and attaches it to a 3D object.
// x and y are the label's position relative to that object.
function addLabel(parent, text, x, y) {
  const element = document.createElement('div');
  element.className = 'planet-label';
  element.textContent = text;

  const label = new CSS2DObject(element);
  label.position.set(x, y, 0);
  parent.add(label);

  return label;
}

function createSun() {
  const geometry = new THREE.SphereGeometry(4.5, 64, 64);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffc45c
  });

  sun = new THREE.Mesh(geometry, material);
  sun.name = 'Sun';
  sun.userData = {
    name: 'The Sun',
    file: 'sun.html',
    description: 'The star at the centre of our Solar System.'
  };

  scene.add(sun);
  clickableObjects.push(sun);

  const glowMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xffa43b,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.6
  });

  sunGlow = new THREE.Sprite(glowMaterial);
  sunGlow.scale.set(19, 19, 1);
  scene.add(sunGlow);

  const light = new THREE.PointLight(0xffc46c, 450, 220);
  scene.add(light);

  // Label below the Sun (sun radius is 4.5).
  addLabel(sun, 'Sun', 0, -6.2);
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);

  gradient.addColorStop(0, 'rgba(255, 220, 130, 0.9)');
  gradient.addColorStop(0.25, 'rgba(255, 160, 60, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 130, 40, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

function createOrbit(distance) {
  const points = [];
  const segments = 256;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;

    points.push(
      new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      )
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x6474a7,
    transparent: true,
    opacity: 0.32
  });

  const line = new THREE.LineLoop(geometry, material);
  scene.add(line);
  orbitLines.push(line);
}

function createPlanet(world) {
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const geometry = new THREE.SphereGeometry(world.radius, 48, 48);
  const texture = createTexture(world.color, world.type);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: world.type === 'gas' ? 0.82 : 0.92,
    metalness: 0.02
  });

  const planet = new THREE.Mesh(geometry, material);
  planet.position.x = world.distance;
  planet.rotation.z = world.name === 'Uranus' ? 1.3 : 0.05;
  planet.userData = {
    name: world.name,
    file: world.file,
    description: world.description
  };

  orbitGroup.add(planet);
  clickableObjects.push(planet);
  planetMeshes.push({
    mesh: planet,
    group: orbitGroup,
    speed: world.speed,
    spin: 0.18 + world.speed
  });

  // Name label below the planet. It is attached to the orbit group (not the
  // planet mesh) so it does not spin or tilt with the planet.
  // Saturn's rings extend further out, so its label sits lower.
  const labelOffset = world.rings
    ? world.radius * 1.9 + 0.9
    : world.radius + 0.9;

  addLabel(orbitGroup, world.name, world.distance, -labelOffset);

  if (world.rings) {
    const ringGeometry = new THREE.RingGeometry(
      world.radius * 1.35,
      world.radius * 2.15,
      96
    );

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8c39b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      roughness: 0.95
    });

    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    rings.rotation.x = -Math.PI / 2.4;
    planet.add(rings);
  }

  createOrbit(world.distance);
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#050816');

  camera = new THREE.PerspectiveCamera(
    45,
    viewer.clientWidth / viewer.clientHeight,
    0.1,
    1200
  );

  camera.position.set(0, 78, 100);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  renderer.domElement.setAttribute(
    'aria-label',
    'Interactive 3D Solar System. Drag to rotate, scroll to zoom, and click a celestial body to open its page.'
  );

  viewer.prepend(renderer.domElement);

  // Layer that draws the planet name labels on top of the 3D canvas.
  // pointer-events: none keeps dragging and clicking working on the canvas.
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(viewer.clientWidth, viewer.clientHeight);
  labelRenderer.domElement.className = 'label-layer';
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  viewer.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = true;
  controls.minDistance = 18;
  controls.maxDistance = 190;
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0x9da9dc, 1.5));

  const fillLight = new THREE.DirectionalLight(0xa9c5ff, 1.3);
  fillLight.position.set(-40, 60, 30);
  scene.add(fillLight);

  createStars();
  createSun();

  worlds.forEach((world) => {
    createPlanet(world);
  });

  loadingMessage.classList.add('loaded');

  setTimeout(() => {
    loadingMessage.style.display = 'none';
  }, 600);
}

function showPlanetInfo(data) {
  selectedPlanet = data;

  tooltipName.textContent = data.name;
  tooltipDescription.textContent = data.description;
  tooltipLink.href = `planets/${data.file}`;

  tooltip.hidden = false;
}

function hidePlanetInfo() {
  selectedPlanet = null;
  tooltip.hidden = true;
}

function onPointerDown(event) {
  pointerStart = {
    x: event.clientX,
    y: event.clientY
  };
}

function onPointerUp(event) {
  if (!pointerStart) return;

  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = null;

  // Avoid treating a camera drag as a planet click.
  if (Math.hypot(dx, dy) > 5) return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(
    clickableObjects,
    false
  );

  if (intersections.length > 0) {
    showPlanetInfo(intersections[0].object.userData);
  } else {
    hidePlanetInfo();
  }
}

function animate(time = 0) {
  animationFrame = requestAnimationFrame(animate);

  const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
  lastTime = time;
  elapsed += delta;

  planetMeshes.forEach((planet) => {
    // Rotate the parent group around the Sun.
    // The planet itself stays at its local orbital distance.
    planet.group.rotation.y += planet.speed * delta * 0.25;

    // Rotate the planet around its own axis.
    planet.mesh.rotation.y += planet.spin * delta;
  });

  sun.rotation.y += delta * 0.04;

  if (sunGlow) {
    const pulse = 1 + Math.sin(elapsed * 1.2) * 0.025;
    sunGlow.scale.set(19 * pulse, 19 * pulse, 1);
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function resizeRenderer() {
  if (!renderer || !camera) return;

  const width = viewer.clientWidth;
  const height = viewer.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}

function toggleOrbits() {
  orbitsVisible = !orbitsVisible;

  orbitLines.forEach((line) => {
    line.visible = orbitsVisible;
  });

  toggleOrbitsButton.textContent = orbitsVisible
    ? 'Hide orbits'
    : 'Show orbits';
}

function resetCamera() {
  camera.position.set(0, 78, 100);
  controls.target.set(0, 0, 0);
  controls.update();
  hidePlanetInfo();
}

function startExplorer() {
  try {
    setupScene();

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    toggleOrbitsButton.addEventListener('click', toggleOrbits);
    resetViewButton.addEventListener('click', resetCamera);
    closeTooltipButton.addEventListener('click', hidePlanetInfo);

    window.addEventListener('resize', resizeRenderer);

    animate();
  } catch (error) {
    console.error('Solar System Explorer failed to start:', error);
    loadingMessage.style.display = 'none';
    errorMessage.hidden = false;
  }
}

startExplorer();