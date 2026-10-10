import assert from 'node:assert/strict';

const base = process.argv[2] || 'https://cinematic-chapters.co.uk';
const request = (route, options) => fetch(new URL(route, base), { signal: AbortSignal.timeout(60000), ...options });
for (const route of ['/', '/book', '/admin', '/client']) {
  const response = await request(route);
  assert.equal(response.status, 200, `${route} must render`);
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  await response.arrayBuffer();
  console.log(`PASS ${route} renders with security headers`);
}
const contentResponse = await request('/api/content');
assert.equal(contentResponse.status, 200);
const content = await contentResponse.json();
assert.ok(content.hero?.length, 'Published content must include a hero photograph');
const photo = await request(`/api/media/${content.hero[0].id}?w=480`);
assert.equal(photo.status, 200);
assert.ok(photo.headers.get('content-type')?.startsWith('image/'));
assert.ok((await photo.arrayBuffer()).byteLength > 1000);
console.log('PASS published content and photograph');
for (const route of ['/api/admin/content', '/api/client', `/api/media/${content.hero[0].id}?draft=1`]) {
  const response = await request(route);
  assert.equal(response.status, 403, `${route} must reject anonymous access`);
  console.log(`PASS anonymous access rejected for ${route}`);
}
if (base.startsWith('https://')) {
  for (const url of ['http://cinematic-chapters.co.uk/', 'https://www.cinematic-chapters.co.uk/']) {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), 'https://cinematic-chapters.co.uk/');
  }
  console.log('PASS HTTPS and canonical domain redirects');
}
