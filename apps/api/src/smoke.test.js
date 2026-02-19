const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp, prisma } = require('./app');

const app = createApp();
let token;

test('POST /auth/login should authenticate seeded user', async () => {
  const response = await request(app).post('/auth/login').send({
    email: 'mario@home.local',
    password: 'Mario1234!'
  });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.displayName, 'Mario');

  token = response.body.token;
});

test('GET /summary should return personal summary payload', async () => {
  const month = new Date().toISOString().slice(0, 7);

  const response = await request(app)
    .get(`/summary?month=${month}&scope=personal`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.scope, 'personal');
  assert.equal(typeof response.body.incomeTotal, 'number');
  assert.equal(typeof response.body.progress, 'number');
});

test.after(async () => {
  await prisma.$disconnect();
});
