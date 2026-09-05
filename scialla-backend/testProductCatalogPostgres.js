// Tests against a temporary copy of product_stock; never changes live records.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const db = require('./db');
const { initializeCatalog, registerCatalogRoutes } = require('./productCatalog');

async function run() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE product_stock (LIKE public.product_stock INCLUDING ALL) ON COMMIT DROP');
    await client.query('INSERT INTO pg_temp.product_stock SELECT * FROM public.product_stock');
    await client.query('SET LOCAL search_path TO pg_temp, public');
    const before = await client.query('SELECT item_id, in_stock, quantity FROM product_stock ORDER BY item_id');
    await initializeCatalog(client);
    const after = await client.query('SELECT item_id, in_stock, quantity FROM product_stock WHERE item_id = ANY($1) ORDER BY item_id', [before.rows.map(r => r.item_id)]);
    assert.deepEqual(after.rows, before.rows);
    const routes = {}, events = [];
    const app = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, (path, ...handlers) => { routes[method + path] = handlers.at(-1); }]));
    registerCatalogRoutes(app, client, { emit: (...args) => events.push(args) }, { requireDatabase() {}, verifyToken() {}, verifyManager() {} });
    const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    let data = { name: 'Temporary Test Latte', categoryId: 'coffee', description: 'Initial', price: '49.00',
      sizes: [{ size: '12 oz', price: 49 }, { size: '16 oz', price: 69 }, { size: '22 oz', price: 89 }],
      image: '/images/products/spanish.png', active: true, inStock: true };
    await routes['post/api/products']({ params: {}, body: data }, response);
    assert.equal(response.code, 201);
    const id = response.body.product.id;
    data = { ...data, description: 'Updated description', price: 55, sizes: data.sizes.map(s => ({ ...s, price: s.size === '16 oz' ? 75 : s.price })) };
    await routes['patch/api/products/:id']({ params: { id }, body: data }, response);
    assert.equal(response.code, 200);
    assert.equal(response.body.product.description, 'Updated description');
    assert.equal(response.body.product.sizes[1].price, 75);
    for (const inStock of [false, true]) {
      await routes['patch/api/products/:id']({ params: { id }, body: { ...data, inStock } }, response);
      assert.equal(response.body.product.inStock, inStock);
    }
    await initializeCatalog(client); // simulate backend restart: edits must survive seeding
    await routes['get/api/products']({}, response);
    const saved = response.body.products.find(p => p.id === id);
    assert.equal(saved.price, 55);
    assert.equal(saved.sizes[1].price, 75);
    assert.equal(saved.description, 'Updated description');
    assert.equal(events.length, 4);
    assert(events.every(e => e[0] === 'product:updated'));
    console.log('PASS PostgreSQL: existing stock preserved; add/edit/load; size pricing; availability off/on; restart-safe seeding; product events. All changes isolated to a temporary table.');
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await db.pool.end();
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; db.pool?.end(); });
