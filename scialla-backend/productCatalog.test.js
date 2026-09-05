const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateProduct, formatProduct, initializeCatalog, registerCatalogRoutes } = require('./productCatalog');
const categories = require('../shared/catalog.json');

const product = (changes = {}) => ({ name: 'Test Latte', categoryId: 'coffee', description: 'Test description',
  price: '49.00', sizes: null, image: '/images/products/spanish.png', inStock: true, active: true, ...changes });

test('validates money, categories, optional sizes, and image paths', () => {
  for (const price of ['abc', -1, '', null, true, Infinity, '1.001', '100000000']) {
    assert.throws(() => validateProduct(product({ price })));
  }
  assert.equal(validateProduct(product({ price: 0 })).price, 0);
  assert.throws(() => validateProduct(product({ categoryId: 'invented' })));
  assert.throws(() => validateProduct(product({ image: '/images/products/../secret.png' })));
  const sizes = categories[0].items[0].sizes.map(s => ({ ...s, price: '75.00' }));
  assert.equal(validateProduct(product({ sizes })).sizes[1].price, 75);
  assert.throws(() => validateProduct(product({ sizes: [{ size: '16 oz', price: -1 }] })));
  assert.equal(validateProduct(product({ categoryId: 'pizza' })).sizes, null);
});

test('unavailable and inactive products remain present but cannot be added', () => {
  const row = { item_id: 'cf3', category_id: 'coffee', name: 'Spanish Latte', price: '49.00', active: true, in_stock: true, quantity: 50 };
  assert.equal(formatProduct(row).inStock, true);
  assert.equal(formatProduct({ ...row, in_stock: false }).inStock, false);
  assert.equal(formatProduct({ ...row, active: false }).inStock, false);
  assert.equal(formatProduct({ ...row, quantity: 0 }).inStock, false);
});

test('save endpoints enforce manager middleware and emit only after persistence', async () => {
  const routes = {}, writes = [], events = [];
  const guards = { requireDatabase() {}, verifyToken() {}, verifyManager() {} };
  const app = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, (path, ...handlers) => { routes[method + path] = handlers; }]));
  const db = { query: async (sql, args) => {
    writes.push(sql);
    return { rows: [{ item_id: args[0], name: args[1], category_id: args[2], description: args[3], price: args[4],
      sizes: args[5] && JSON.parse(args[5]), image: args[6], in_stock: args[7], active: args[8], quantity: 50 }] };
  } };
  registerCatalogRoutes(app, db, { emit: (...args) => events.push(args) }, guards);
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  for (const [route, id] of [['post/api/products', undefined], ['patch/api/products/:id', 'cf3']]) {
    assert.deepEqual(routes[route].slice(0, 3), Object.values(guards));
    await routes[route].at(-1)({ params: { id }, body: product() }, response);
    assert.equal(response.code, id ? 200 : 201);
    if (id) assert.equal(response.body.product.id, id);
  }
  assert.match(writes[0], /^INSERT/);
  assert.match(writes[1], /^UPDATE/);
  assert.equal(events.length, 2);
  assert.equal(events[0][0], 'product:updated');
  await routes['post/api/products'].at(-1)({ params: {}, body: product({ price: -1 }) }, response);
  assert.equal(response.code, 400);
  assert.equal(writes.length, 2);
  assert(writes.every(sql => !/order_items|UPDATE orders/.test(sql)));
});

test('seed migration never deletes records and only initializes missing catalog fields', async () => {
  const calls = [];
  await initializeCatalog({ query: async (sql, args) => { calls.push({ sql, args }); } });
  assert.match(calls[0].sql, /ADD COLUMN IF NOT EXISTS price NUMERIC\(10,2\)/);
  assert.equal(calls.length - 1, categories.reduce((sum, c) => sum + c.items.length, 0));
  assert(calls.slice(1).every(call => call.sql.includes('WHERE product_stock.category_id IS NULL')));
  assert(calls.every(call => !/DELETE|TRUNCATE|DROP TABLE/.test(call.sql)));
});
