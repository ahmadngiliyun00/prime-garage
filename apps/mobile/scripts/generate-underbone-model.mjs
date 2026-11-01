#!/usr/bin/env node
/**
 * Generates assets/models/underbone_v1.glb: a stylized low-poly underbone (motor bebek)
 * modeled after the general shape of a Honda Supra X 125 class motorcycle, without any brand marks.
 *
 * Conventions (docs/3D-VIEWER.md):
 *   - meters, +Y up, vehicle faces +X, +Z is the rider's right side, wheels touch y = 0
 *   - interactive meshes: part__<part_code> or part__<part_code>__<nn>
 *   - non-interactive meshes: body__<name>
 *
 * Run: npm run generate:model (from apps/mobile)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { PARTS, partCodeFromNodeName } from '@prime-garage/shared';

// --- Node polyfill: GLTFExporter (binary) reads Blobs through FileReader ---
globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../assets/models/underbone_v1.glb');

// ---------- Materials ----------
const mat = (name, color, { metalness = 0.1, roughness = 0.6, emissive, emissiveIntensity = 0 } = {}) => {
  const m = new THREE.MeshStandardMaterial({ name, color, metalness, roughness });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = emissiveIntensity;
  }
  return m;
};

const M = {
  paint: mat('paint_red', '#c62828', { metalness: 0.35, roughness: 0.35 }),
  paintDark: mat('paint_black', '#1f2937', { metalness: 0.3, roughness: 0.4 }),
  plastic: mat('plastic_black', '#111827', { roughness: 0.85 }),
  rubber: mat('rubber', '#0b0f19', { roughness: 0.95 }),
  metal: mat('metal', '#9ca3af', { metalness: 0.8, roughness: 0.35 }),
  metalDark: mat('metal_dark', '#4b5563', { metalness: 0.7, roughness: 0.5 }),
  engine: mat('engine', '#6b7280', { metalness: 0.6, roughness: 0.45 }),
  chrome: mat('chrome', '#e5e7eb', { metalness: 1, roughness: 0.15 }),
  caliper: mat('caliper_gold', '#d97706', { metalness: 0.6, roughness: 0.35 }),
  oilCap: mat('oil_cap', '#f59e0b', { metalness: 0.2, roughness: 0.5 }),
  battery: mat('battery', '#1d4ed8', { roughness: 0.6 }),
  spring: mat('spring_red', '#b91c1c', { metalness: 0.5, roughness: 0.4 }),
  seat: mat('seat', '#0f172a', { roughness: 0.9 }),
  headlight: mat('headlight', '#fef9c3', { roughness: 0.1, emissive: '#fde68a', emissiveIntensity: 0.7 }),
  taillight: mat('taillight', '#ef4444', { roughness: 0.2, emissive: '#ef4444', emissiveIntensity: 0.5 }),
  indicator: mat('indicator', '#f97316', { roughness: 0.2, emissive: '#f97316', emissiveIntensity: 0.3 }),
  porcelain: mat('porcelain', '#f8fafc', { roughness: 0.4 }),
};

// ---------- Helpers ----------
const root = new THREE.Group();
root.name = 'underbone_v1';
const names = new Set();

function add(mesh, name, parent = root) {
  if (names.has(name)) throw new Error(`Duplicate node name ${name}`);
  names.add(name);
  mesh.name = name;
  mesh.geometry.name = `${name}_geo`;
  parent.add(mesh);
  return mesh;
}

function group(name) {
  const g = new THREE.Group();
  g.name = name;
  names.add(name);
  root.add(g);
  return g;
}

function box(name, size, pos, material, rot = [0, 0, 0], parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  return add(m, name, parent);
}

/** Cylinder between two points. */
function tube(name, from, to, radius, material, parent, radiusTop = radius, segments = 16) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radius, len, segments), material);
  m.position.copy(a.clone().add(b).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return add(m, name, parent);
}

/** Disc/cylinder whose axis is +Z (wheel-like). */
function disc(name, radius, thickness, pos, material, parent, segments = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, segments), material);
  m.rotation.x = Math.PI / 2;
  m.position.set(...pos);
  return add(m, name, parent);
}

/** Cylinder whose axis is +X. */
function xCyl(name, radius, length, pos, material, parent, radiusEnd = radius) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radiusEnd, radius, length, 24), material);
  m.rotation.z = -Math.PI / 2;
  m.position.set(...pos);
  return add(m, name, parent);
}

function torus(name, R, r, pos, material, { arc = Math.PI * 2, rotZ = 0, scaleZ = 1 } = {}, parent) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 14, 48, arc), material);
  m.position.set(...pos);
  m.rotation.z = rotZ;
  m.scale.z = scaleZ;
  return add(m, name, parent);
}

// ---------- Model ----------
const F = [0.62, 0.3, 0];
const R = [-0.62, 0.3, 0];

function wheel(prefix, center, tirePart) {
  torus(tirePart, 0.255, 0.045, center, M.rubber);
  torus(`body__${prefix}_rim`, 0.212, 0.014, center, M.metalDark);
  disc(`body__${prefix}_hub`, 0.05, 0.12, center, M.metal);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = box(`body__${prefix}_spoke_${i + 1}`, [0.16, 0.022, 0.018], center, M.metalDark, [0, 0, a]);
    s.position.x += Math.cos(a) * 0.12;
    s.position.y += Math.sin(a) * 0.12;
  }
}

wheel('wheel_front', F, 'part__tire_front');
wheel('wheel_rear', R, 'part__tire_rear');

// Fenders
torus('body__front_fender', 0.3, 0.045, F, M.paint, { arc: 1.7, rotZ: Math.PI / 2 - 0.65, scaleZ: 1.4 });
torus('body__rear_fender', 0.31, 0.04, R, M.plastic, { arc: 1.3, rotZ: Math.PI / 2 + 0.2, scaleZ: 1.5 });

// Front brake: disc + caliper (left side)
disc('body__brake_disc_front', 0.11, 0.006, [F[0], F[1], -0.068], M.chrome);
box('part__brake_pad_front', [0.07, 0.1, 0.045], [0.54, 0.38, -0.08], M.caliper, [0, 0, -0.8]);

// Rear drum brake (right side)
const drum = group('part__brake_shoe_rear');
disc('part__brake_shoe_rear__01', 0.088, 0.05, [R[0], R[1], 0.075], M.metal, drum);
box('part__brake_shoe_rear__02', [0.14, 0.018, 0.012], [R[0] + 0.06, R[1] + 0.06, 0.105], M.metalDark, [0, 0, 0.6], drum);

// Front fork (left and right legs)
const fork = group('part__front_fork');
for (const [i, z] of [-0.075, 0.075].entries()) {
  tube(`part__front_fork__0${i * 2 + 1}`, [F[0], F[1], z], [0.56, 0.62, z], 0.026, M.metalDark, fork);
  tube(`part__front_fork__0${i * 2 + 2}`, [0.56, 0.62, z], [0.49, 0.93, z], 0.019, M.chrome, fork);
}

// Steering, handlebar, head cowl, headlight, mirrors
tube('body__handlebar', [0.47, 1.0, -0.34], [0.47, 1.0, 0.34], 0.012, M.metalDark);
tube('body__grip_left', [0.47, 1.0, -0.37], [0.47, 1.0, -0.28], 0.018, M.rubber);
tube('body__grip_right', [0.47, 1.0, 0.28], [0.47, 1.0, 0.37], 0.018, M.rubber);
box('body__head_cowl', [0.24, 0.12, 0.32], [0.5, 1.02, 0], M.paint, [0, 0, -0.12]);
box('body__speedometer', [0.1, 0.02, 0.16], [0.44, 1.085, 0], M.plastic, [0, 0, -0.35]);
for (const [i, z] of [-0.2, 0.2].entries()) {
  tube(`body__mirror_stem_${i + 1}`, [0.46, 1.03, z], [0.42, 1.2, z * 1.2], 0.006, M.metalDark);
  box(`body__mirror_${i + 1}`, [0.02, 0.06, 0.1], [0.42, 1.22, z * 1.25], M.plastic);
}
const lights = group('part__lighting');
xCyl('part__lighting__01', 0.07, 0.05, [0.635, 0.98, 0], M.headlight, lights, 0.06);
box('part__lighting__02', [0.05, 0.06, 0.2], [-0.95, 0.775, 0], M.taillight, [0, 0, 0], lights);
box('part__lighting__03', [0.04, 0.03, 0.05], [0.6, 1.0, -0.17], M.indicator, [0, 0, 0], lights);
box('part__lighting__04', [0.04, 0.03, 0.05], [0.6, 1.0, 0.17], M.indicator, [0, 0, 0], lights);
box('part__lighting__05', [0.04, 0.03, 0.05], [-0.93, 0.74, -0.12], M.indicator, [0, 0, 0], lights);
box('part__lighting__06', [0.04, 0.03, 0.05], [-0.93, 0.74, 0.12], M.indicator, [0, 0, 0], lights);

// Brake master cylinder and fluid reservoir (right handlebar)
const master = group('part__brake_fluid');
box('part__brake_fluid__01', [0.05, 0.035, 0.06], [0.5, 1.055, 0.22], M.metalDark, [0, 0, 0], master);
box('part__brake_fluid__02', [0.035, 0.02, 0.045], [0.5, 1.082, 0.22], M.porcelain, [0, 0, 0], master);

// Body: leg shield, front cover, rear cowl, tail, seat
box('body__leg_shield', [0.07, 0.5, 0.42], [0.37, 0.64, 0], M.paint, [0, 0, 0.22]);
box('body__front_cover', [0.16, 0.3, 0.17], [0.45, 0.82, 0], M.paint, [0, 0, 0.35]);
box('body__rear_cowl', [0.72, 0.16, 0.3], [-0.43, 0.665, 0], M.paint, [0, 0, -0.05]);
box('body__tail', [0.22, 0.13, 0.22], [-0.84, 0.75, 0], M.paint, [0, 0, -0.12]);
box('body__side_stripe_left', [0.5, 0.025, 0.004], [-0.4, 0.68, -0.151], M.paintDark, [0, 0, -0.05]);
box('body__side_stripe_right', [0.5, 0.025, 0.004], [-0.4, 0.68, 0.151], M.paintDark, [0, 0, -0.05]);
box('body__seat', [0.7, 0.09, 0.27], [-0.32, 0.86, 0], M.seat, [0, 0, -0.04]);
tube('body__grab_rail_left', [-0.55, 0.82, -0.14], [-0.85, 0.84, -0.12], 0.012, M.chrome);
tube('body__grab_rail_right', [-0.55, 0.82, 0.14], [-0.85, 0.84, 0.12], 0.012, M.chrome);

// Fuel tank: under the seat on an underbone, visible as a band between cowl and seat
box('part__fuel_tank', [0.4, 0.075, 0.31], [-0.27, 0.775, 0], M.paintDark, [0, 0, -0.04]);

// Battery: under the seat front, visible in the gap behind the leg shield
box('part__battery', [0.11, 0.13, 0.17], [-0.02, 0.56, 0], M.battery);

// Frame and swingarm
tube('body__frame_down', [0.46, 0.86, 0], [0.2, 0.42, 0], 0.03, M.metalDark);
tube('body__frame_mid', [0.2, 0.42, 0], [-0.08, 0.52, 0], 0.03, M.metalDark);
tube('body__frame_rail_left', [-0.08, 0.55, -0.1], [-0.8, 0.74, -0.1], 0.016, M.metalDark);
tube('body__frame_rail_right', [-0.08, 0.55, 0.1], [-0.8, 0.74, 0.1], 0.016, M.metalDark);
tube('body__swingarm_left', [-0.02, 0.3, -0.1], [R[0], R[1], -0.1], 0.018, M.metalDark);
tube('body__swingarm_right', [-0.02, 0.3, 0.1], [R[0], R[1], 0.1], 0.018, M.metalDark);
tube('body__footrest', [0.02, 0.24, -0.28], [0.02, 0.24, 0.28], 0.012, M.metalDark);
tube('body__footrest_rubber_left', [0.02, 0.24, -0.3], [0.02, 0.24, -0.2], 0.02, M.rubber);
tube('body__footrest_rubber_right', [0.02, 0.24, 0.2], [0.02, 0.24, 0.3], 0.02, M.rubber);
tube('body__side_stand', [-0.08, 0.27, -0.12], [-0.12, 0.02, -0.2], 0.01, M.metalDark);

// Rear shocks (left and right): body + spring
const shock = group('part__rear_shock');
for (const [i, z] of [-0.14, 0.14].entries()) {
  tube(`part__rear_shock__0${i * 2 + 1}`, [-0.53, 0.33, z], [-0.46, 0.76, z], 0.014, M.chrome, shock);
  tube(`part__rear_shock__0${i * 2 + 2}`, [-0.515, 0.42, z], [-0.475, 0.66, z], 0.03, M.spring, shock);
}

// Engine (horizontal cylinder bebek engine)
box('body__engine_case', [0.34, 0.24, 0.26], [0.05, 0.3, 0], M.engine);
box('body__engine_case_left_cover', [0.22, 0.18, 0.02], [0.06, 0.3, -0.14], M.metal);
tube('body__cylinder', [0.2, 0.36, 0], [0.42, 0.43, 0], 0.072, M.engine);
for (let i = 0; i < 4; i++) {
  const t = 0.2 + i * 0.25;
  const x = 0.2 + (0.42 - 0.2) * t;
  const y = 0.36 + (0.43 - 0.36) * t;
  tube(`body__cylinder_fin_${i + 1}`, [x - 0.006, y - 0.002, 0], [x + 0.006, y + 0.002, 0], 0.098, M.metal);
}
box('part__valve_clearance', [0.075, 0.16, 0.16], [0.46, 0.45, 0], M.metal, [0, 0, -0.3]);

const plug = group('part__spark_plug');
tube('part__spark_plug__01', [0.41, 0.49, 0], [0.43, 0.56, 0], 0.012, M.porcelain, plug);
tube('part__spark_plug__02', [0.43, 0.56, 0], [0.45, 0.6, 0], 0.022, M.plastic, plug);

xCyl('part__throttle_body', 0.03, 0.09, [0.25, 0.57, 0], M.chrome);
tube('body__intake', [0.2, 0.57, 0], [0.12, 0.6, -0.08], 0.022, M.rubber);
box('part__air_filter', [0.24, 0.14, 0.16], [0.02, 0.6, -0.12], M.plastic);
tube('body__carb_to_head', [0.3, 0.57, 0], [0.38, 0.47, 0], 0.02, M.metalDark);

const oil = group('part__engine_oil');
disc('part__engine_oil__01', 0.03, 0.04, [-0.06, 0.38, 0.15], M.oilCap, oil);
box('part__engine_oil__02', [0.012, 0.03, 0.012], [-0.06, 0.38, 0.178], M.oilCap, [0, 0, 0], oil);

disc('part__clutch', 0.09, 0.03, [0.1, 0.31, 0.14], M.metal);

// Exhaust (right side)
const exhaust = group('part__exhaust');
tube('part__exhaust__01', [0.43, 0.38, 0.04], [0.32, 0.18, 0.12], 0.022, M.metalDark, exhaust);
tube('part__exhaust__02', [0.32, 0.18, 0.12], [-0.08, 0.21, 0.19], 0.022, M.metalDark, exhaust);
tube('part__exhaust__03', [-0.08, 0.23, 0.2], [-0.62, 0.34, 0.2], 0.055, M.metalDark, exhaust, 0.045);
tube('part__exhaust__04', [-0.62, 0.34, 0.2], [-0.67, 0.35, 0.2], 0.03, M.chrome, exhaust);

// Drive chain and sprockets (left side)
const chain = group('part__drive_chain');
disc('part__drive_chain__01', 0.045, 0.012, [-0.02, 0.3, -0.125], M.metal, chain, 20);
disc('part__drive_chain__02', 0.09, 0.008, [R[0], R[1], -0.125], M.metal, chain, 36);
tube('part__drive_chain__03', [-0.02, 0.347, -0.125], [R[0], 0.393, -0.125], 0.007, M.metalDark, chain);
tube('part__drive_chain__04', [-0.02, 0.253, -0.125], [R[0], 0.207, -0.125], 0.007, M.metalDark, chain);
box('body__chain_guard', [0.5, 0.035, 0.01], [-0.32, 0.4, -0.14], M.plastic, [0, 0, -0.07]);

// ---------- Validate naming ----------
const interactive = new Set();
root.traverse((o) => {
  const code = partCodeFromNodeName(o.name);
  if (code) interactive.add(code);
  else if (o !== root && !o.name.startsWith('body__')) throw new Error(`Unexpected node name ${o.name}`);
});
const known = new Set(PARTS.map((p) => p.code));
for (const code of interactive) if (!known.has(code)) throw new Error(`Mesh uses unknown part code ${code}`);
const missing = [...known].filter((c) => !interactive.has(c));
if (missing.length) throw new Error(`Parts without mesh: ${missing.join(', ')}`);

// ---------- Export ----------
root.updateMatrixWorld(true);
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(root, { binary: true, onlyVisible: true });
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, Buffer.from(glb));

let triangles = 0;
root.traverse((o) => {
  if (o.isMesh) {
    const g = o.geometry;
    triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  }
});
console.log(
  `Wrote ${path.relative(process.cwd(), OUT)}: ${(glb.byteLength / 1024).toFixed(1)} KB, ${Math.round(triangles)} triangles, ${interactive.size} interactive parts`,
);
