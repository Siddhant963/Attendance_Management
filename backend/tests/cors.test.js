import { test } from 'node:test';
import assert from 'node:assert/strict';

// Configured with trailing slashes and padding, as commonly pasted into a hosting dashboard.
process.env.CLIENT_ORIGIN = ' https://app.example.com/ , https://other.example.com ';
const { api } = await import('./helpers.js');

const preflight = (origin) =>
  api.options('/api/auth/login').set('Origin', origin).set('Access-Control-Request-Method', 'POST');

test('CLIENT_ORIGIN entries match browser origins despite trailing slashes and spaces', async () => {
  for (const origin of ['https://app.example.com', 'https://other.example.com']) {
    assert.equal((await preflight(origin)).headers['access-control-allow-origin'], origin);
  }
});

test('origins that are not configured get no CORS allowance', async () => {
  for (const origin of ['https://evil.example.com', 'https://app.example.com.evil.com', 'http://app.example.com']) {
    assert.equal((await preflight(origin)).headers['access-control-allow-origin'], undefined, origin);
  }
});
