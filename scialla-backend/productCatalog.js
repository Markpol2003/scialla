const { randomUUID } = require('crypto');
const categories = require('../shared/catalog.json');

const migration = `
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS category_id VARCHAR(50);
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS sizes JSONB;
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE product_stock ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
`;

async function initializeCatalog(db) {
  await db.query(migration);
  for (const category of categories) {
    for (const item of category.items) {
      await db.query(`INSERT INTO product_stock
        (item_id, name, category_id, description, price, sizes, image, tag, in_stock)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (item_id) DO UPDATE SET
          category_id = EXCLUDED.category_id, description = EXCLUDED.description,
          price = EXCLUDED.price, sizes = EXCLUDED.sizes, image = EXCLUDED.image, tag = EXCLUDED.tag
        WHERE product_stock.category_id IS NULL`,
      [item.id, item.name, category.id, item.description, item.price,
        item.sizes ? JSON.stringify(item.sizes) : null, item.image, item.tag, item.inStock]);
    }
  }
}

function money(value) {
  if (!['string', 'number'].includes(typeof value) ||
      !/^\d+(\.\d{1,2})?$/.test(String(value)) || !Number.isFinite(Number(value)) || Number(value) > 99999999.99) {
    throw new Error('Prices must be numeric, zero or greater, with at most two decimal places.');
  }
  return Number(value);
}

function validateProduct(body) {
  const category = categories.find(c => c.id === body.categoryId);
  if (!category) throw new Error('Choose an existing category.');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255) throw new Error('Product name is required (maximum 255 characters).');
  if (typeof body.description !== 'string' || body.description.length > 5000) throw new Error('Description must be at most 5000 characters.');
  if (typeof body.inStock !== 'boolean' || typeof body.active !== 'boolean') throw new Error('Availability and active status are required.');
  if (typeof body.image !== 'string' || (body.image && !/^\/images\/products\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp|gif|svg)$/i.test(body.image))) throw new Error('Use an existing /images/products/ image path.');
  const allowedSizes = category.items.find(i => i.sizes)?.sizes || [];
  let sizes = null;
  if (body.sizes != null) {
    if (!Array.isArray(body.sizes) || !allowedSizes.length || body.sizes.length !== allowedSizes.length) throw new Error('Provide all size prices for this category, or disable size pricing.');
    sizes = allowedSizes.map(s => {
      const entry = body.sizes.find(v => v.size === s.size);
      return { label: s.label, size: s.size, price: money(entry?.price) };
    });
  }
  return { name: body.name.trim(), categoryId: category.id, description: body.description.trim(),
    price: money(body.price), sizes, image: body.image, inStock: body.inStock, active: body.active };
}

function formatProduct(row) {
  return { id: row.item_id, name: row.name, categoryId: row.category_id,
    category: categories.find(c => c.id === row.category_id)?.category || '',
    description: row.description || '', price: Number(row.price), sizes: row.sizes || undefined,
    image: row.image || '', tag: row.tag || '', active: row.active,
    available: row.in_stock && row.quantity > 0,
    inStock: row.active && row.in_stock && row.quantity > 0 };
}

function registerCatalogRoutes(app, db, io, middleware) {
  app.get('/api/products', middleware.requireDatabase, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM product_stock WHERE category_id IS NOT NULL ORDER BY item_id');
      res.json({ success: true, products: result.rows.map(formatProduct) });
    } catch {
      res.status(500).json({ success: false, message: 'Unable to load products.' });
    }
  });
  const save = async (req, res) => {
    let product;
    try { product = validateProduct(req.body); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    const id = req.params.id || `p-${randomUUID()}`;
    const values = [id, product.name, product.categoryId, product.description, product.price,
      product.sizes ? JSON.stringify(product.sizes) : null, product.image, product.inStock, product.active];
    try {
      const result = req.params.id
        ? await db.query(`UPDATE product_stock SET name=$2, category_id=$3, description=$4,
            price=$5, sizes=$6, image=$7, in_stock=$8, active=$9,
            quantity=CASE WHEN $8 AND quantity<=0 THEN 50 ELSE quantity END,
            updated_at=CURRENT_TIMESTAMP WHERE item_id=$1 RETURNING *`, values)
        : await db.query(`INSERT INTO product_stock
            (item_id,name,category_id,description,price,sizes,image,in_stock,active)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, values);
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Product no longer exists.' });
      const saved = formatProduct(result.rows[0]);
      io.emit('product:updated', saved);
      return res.status(req.params.id ? 200 : 201).json({ success: true, product: saved });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to save product. Please try again.' });
    }
  };
  const guards = [middleware.requireDatabase, middleware.verifyToken, middleware.verifyManager];
  app.post('/api/products', ...guards, save);
  app.patch('/api/products/:id', ...guards, save);
}

module.exports = { initializeCatalog, registerCatalogRoutes, validateProduct, formatProduct };
