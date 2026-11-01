#!/usr/bin/env node
/**
 * End-to-end smoke test against a running API with AUTH_DEV_LOGIN_ENABLED=true.
 *   API_URL=http://127.0.0.1:3000 node scripts/smoke-test.mjs
 */
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000';
let token = '';

async function call(method, path, body, { expect = [200, 201, 204], form } = {}) {
  const headers = { 'x-client': 'native' };
  if (token) headers.authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}/api${path}`, { method, headers, body: payload });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!expect.includes(res.status)) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return { status: res.status, json };
}

const step = (name) => console.log(`✓ ${name}`);
const email = `smoke-${Date.now()}@example.com`;

// Auth
const login = await call('POST', '/auth/dev-login', { email, name: 'Ahmad Uji' });
token = login.json.accessToken;
assert.ok(login.json.refreshToken, 'native login returns refresh token');
step('dev login');
const refreshed = await call('POST', '/auth/refresh', { refreshToken: login.json.refreshToken });
await call('POST', '/auth/refresh', { refreshToken: login.json.refreshToken }, { expect: [401] });
await call('POST', '/auth/refresh', { refreshToken: refreshed.json.refreshToken }, { expect: [401] });
step('refresh rotation and reuse detection');
token = (await call('POST', '/auth/dev-login', { email, name: 'Ahmad Uji' })).json.accessToken;
await call('GET', '/me');
const garages = (await call('GET', '/me/garages')).json;
assert.equal(garages.length, 1);
assert.equal(garages[0].role, 'owner');
step('personal garage created automatically');

// Realtime
const events = [];
const socket = io(API, { path: '/api/socket.io', auth: { token }, transports: ['websocket'] });
await new Promise((resolve, reject) => {
  socket.on('connect', resolve);
  socket.on('connect_error', reject);
});
socket.onAny((event, payload) => events.push({ event, payload }));
step('socket connected');

// Catalog
const models = (await call('GET', '/catalog/models')).json;
const supra = models.find((m) => m.slug === 'honda-supra-x-125-fi');
assert.ok(supra);
const parts = (await call('GET', '/catalog/parts')).json;
assert.ok(parts.length >= 18);
for (const key of ['underbone_v1', 'honda_supra_x_125_fi_v1']) {
  const m3d = (await call('GET', `/catalog/models3d/${key}`)).json;
  assert.equal(m3d.partViews.length, parts.length, key);
}
step('catalog');

// Vehicle
const vehicle = (
  await call('POST', '/vehicles', {
    vehicleModelId: supra.id,
    nickname: 'Supra Hitam',
    plateNumber: 'ab 1234 cd',
    year: 2019,
    color: 'Hitam',
    initialOdometerKm: 14000,
  })
).json;
assert.equal(vehicle.plateNumber, 'AB 1234 CD');
assert.equal(vehicle.model3dKey, 'honda_supra_x_125_fi_v1');
const rules = (await call('GET', `/vehicles/${vehicle.id}/rules`)).json;
assert.equal(rules.length, 24);
let components = (await call('GET', `/vehicles/${vehicle.id}/components`)).json;
assert.ok(components.every((c) => c.status === 'NO_DATA'));
step('vehicle created with 24 default rules, all NO_DATA');

// Workshop and service
const workshop = (await call('POST', '/workshops', { name: 'Garam Motor', type: 'general', certification: 'unknown', city: 'Yogyakarta' })).json;
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const service = (
  await call('POST', `/vehicles/${vehicle.id}/services`, {
    serviceDate: daysAgo(80),
    odometerKm: 15000,
    workshopId: workshop.id,
    laborCost: 25000,
    items: [
      { partCode: 'engine_oil', action: 'replace', productName: 'Oli 10W-30', quantity: 0.8, unit: 'L', unitPrice: 60000 },
      { partCode: 'brake_fluid', action: 'top_up', subtotal: 10000 },
      { partCode: 'drive_chain', action: 'lubricate' },
      { customPartName: 'Cuci motor', action: 'clean', subtotal: 15000 },
    ],
  })
).json;
assert.equal(service.totalCost, 98000);
assert.equal(service.items.length, 4);
assert.equal(service.workshop.name, 'Garam Motor');
step('service recorded with items and computed total');

await call('POST', `/vehicles/${vehicle.id}/odometer`, { km: 16500 });
await call('POST', `/vehicles/${vehicle.id}/odometer`, { km: 100 }, { expect: [409] });
const v2 = (await call('GET', `/vehicles/${vehicle.id}`)).json;
assert.equal(v2.currentOdometerKm, 16500);
step('odometer update and decrease guard');

components = (await call('GET', `/vehicles/${vehicle.id}/components`)).json;
const oil = components.find((c) => c.partCode === 'engine_oil');
assert.equal(oil.baseline.key, service.id);
assert.ok(['SOON', 'DUE'].includes(oil.status), `oil status ${oil.status}`);
step(`engine oil status ${oil.status}, remaining ${oil.remainingPercent}%`);

// Rule update
const oilRule = rules.find((r) => r.partCode === 'engine_oil' && r.action === 'replace');
const updatedRule = (await call('PATCH', `/vehicles/${vehicle.id}/rules/${oilRule.id}`, { intervalKm: 3000 })).json;
assert.equal(updatedRule.intervalKm, 3000);
assert.equal(updatedRule.isCustomized, true);
await call('POST', `/vehicles/${vehicle.id}/rules/${oilRule.id}/reset`);
step('rule customize and reset');

// Attachment (1x1 PNG)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const form = new FormData();
form.append('ownerType', 'service_record');
form.append('ownerId', service.id);
form.append('file', new Blob([png], { type: 'image/png' }), 'nota.png');
const att = (await call('POST', '/attachments', undefined, { form })).json;
const img = await fetch(`${API}${att.url}`);
assert.equal(img.status, 200);
assert.equal(img.headers.get('content-type'), 'image/webp');
assert.equal((await fetch(`${API}/api/attachments/${att.id}/file?exp=1&sig=bad`)).status, 403);
step('receipt photo upload and signed URL');

// Dashboard
const dash = (await call('GET', '/dashboard')).json;
assert.equal(dash.vehicles.length, 1);
assert.ok(dash.vehicles[0].urgent.length > 0);
assert.equal(dash.vehicles[0].lastService.workshopName, 'Garam Motor');
step('dashboard');

// Authorization: a second user cannot see the first user's vehicle
const firstToken = token;
token = (await call('POST', '/auth/dev-login', { email: `other-${Date.now()}@example.com`, name: 'Orang Lain' })).json.accessToken;
await call('GET', `/vehicles/${vehicle.id}`, undefined, { expect: [404] });
await call('GET', `/services/${service.id}`, undefined, { expect: [404] });
assert.equal((await call('GET', '/vehicles')).json.length, 0);
step('cross-user access returns 404');
token = firstToken;

// Realtime events received
await new Promise((r) => setTimeout(r, 300));
const names = new Set(events.map((e) => e.event));
for (const n of ['vehicle.changed', 'service.changed', 'odometer.changed', 'rules.changed', 'workshop.changed']) {
  assert.ok(names.has(n), `missing realtime event ${n}`);
}
step(`realtime events: ${[...names].join(', ')}`);
socket.close();

// Service delete recomputes odometer
await call('DELETE', `/services/${service.id}`);
components = (await call('GET', `/vehicles/${vehicle.id}/components`)).json;
assert.equal(components.find((c) => c.partCode === 'engine_oil').status, 'NO_DATA');
step('service delete resets component baseline');

console.log(`\nSMOKE TEST PASSED (user ${email}, vehicle ${vehicle.id}, today ${today})`);
process.exit(0);
