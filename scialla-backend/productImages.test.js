const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const express = require('express');
const { registerProductImages, MAX_IMAGE_BYTES } = require('./productImages');
const { registerCatalogRoutes } = require('./productCatalog');

test('image upload, serving, product saving and edit preservation', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'scialla-image-test-'));
  const app = express();
  app.use(express.json());
  const guards = {
    verifyToken(req, res, next) { if (!req.get('authorization')) return res.sendStatus(401); next(); },
    verifyManager(req, res, next) { if (req.get('authorization') !== 'Bearer manager') return res.sendStatus(403); next(); },
    requireDatabase(req, res, next) { next(); }
  };
  registerProductImages(app, guards, directory);
  const records = new Map();
  registerCatalogRoutes(app, { query: async (sql, args) => {
    if (sql.startsWith('SELECT')) return { rows: [...records.values()] };
    const row = { item_id: args[0], name: args[1], category_id: args[2], description: args[3], price: args[4],
      sizes: args[5], image: args[6], in_stock: args[7], active: args[8], quantity: 50 };
    records.set(row.item_id, row);
    return { rows: [row] };
  } }, { emit() {} }, guards);
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const upload = (name, type, bytes, authorization = 'Bearer manager') => fetch(`${base}/api/products/images?filename=${encodeURIComponent(name)}`, {
    method: 'POST', headers: { 'Content-Type': type, ...(authorization ? { authorization } : {}) }, body: bytes
  });
  const png = await fs.readFile(path.resolve(__dirname, '../public/images/products/spanish.png'));
  const jpg = await fs.readFile(path.resolve(__dirname, '../public/images/products/product.jpg'));
  const save = async (image, id) => {
    const response = await fetch(base + '/api/products' + (id ? '/' + id : ''), {
      method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', authorization: 'Bearer manager' },
      body: JSON.stringify({ name: 'Image Test', categoryId: 'coffee', description: '', price: 49, sizes: null, image, active: true, inStock: true })
    });
    assert.equal(response.status, id ? 200 : 201);
    return (await response.json()).product;
  };
  try {
    let pngPath, jpgPath;
    await t.test('PNG and JPG upload, save as paths, and are served byte-for-byte', async () => {
      for (const [name, type, bytes] of [['sample.png', 'image/png', png], ['sample.jpg', 'image/jpeg', jpg]]) {
        const response = await upload(name, type, bytes);
        assert.equal(response.status, 201);
        const { image } = await response.json();
        assert.match(image, /^\/images\/products\/product-\d+-[a-f0-9-]+\.(png|jpg)$/);
        const served = await fetch(base + image);
        assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
        assert.deepEqual(Buffer.from(await served.arrayBuffer()), bytes);
        assert.equal((await save(image)).image, image);
        if (name.endsWith('.png')) pngPath = image; else jpgPath = image;
      }
    });
    await t.test('edit without replacement preserves image; replacement updates same product', async () => {
      const original = await save(pngPath);
      assert.equal((await save(original.image, original.id)).image, pngPath);
      const changed = await save(jpgPath, original.id);
      assert.equal(changed.id, original.id);
      assert.equal(changed.image, jpgPath);
      const menu = await (await fetch(base + '/api/products')).json();
      assert.equal(menu.products.find(p => p.id === original.id).image, jpgPath);
    });
    await t.test('unauthenticated and non-manager uploads rejected', async () => {
      assert.equal((await upload('test.png', 'image/png', png, '')).status, 401);
      assert.equal((await upload('test.png', 'image/png', png, 'Bearer staff')).status, 403);
    });
    await t.test('unsupported extensions, MIME mismatch, spoofed content and traversal rejected', async () => {
      for (const name of ['bad.svg', 'bad.js', 'bad.exe', 'bad.php', '../bad.png', '..\\bad.png']) {
        assert.equal((await upload(name, 'image/png', png)).status, 400);
      }
      assert.equal((await upload('bad.jpg', 'image/png', png)).status, 400);
      assert.equal((await upload('bad.png', 'image/png', Buffer.from('<svg/>'))).status, 400);
      assert.equal((await upload('empty.png', 'image/png', Buffer.alloc(0))).status, 400);
    });
    await t.test('over 25 MB rejected without creating a file', async () => {
      assert.equal((await upload('big.png', 'image/png', Buffer.alloc(MAX_IMAGE_BYTES + 1))).status, 413);
      assert.equal((await fs.readdir(directory)).length, 2);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const filename of await fs.readdir(directory)) await fs.unlink(path.join(directory, filename));
    await fs.rmdir(directory);
  }
});
