import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import categories from '../../../shared/catalog.json';
import './ProductForm.css';

export default function ProductForm({ product, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: product?.name || '', categoryId: product?.categoryId || categories[0].id,
    description: product?.description || '', price: product?.price ?? '',
    image: product?.image || '', inStock: product?.available ?? product?.inStock ?? true,
    active: product?.active !== false, sizes: product?.sizes || null
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const category = categories.find(c => c.id === form.categoryId);
  const sizeOptions = category.items.find(i => i.sizes)?.sizes || [];
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try { await onSave(product?.id, form); onClose(); }
    catch (err) { setError(err.message || 'Unable to save product.'); }
    finally { setSaving(false); }
  };
  return createPortal(
    <div className="auth-modal-backdrop" style={{ zIndex: 999999 }} onClick={() => !saving && onClose()}>
      <section className="auth-modal-card product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title" onClick={e => e.stopPropagation()}>
        <h2 id="product-editor-title">{product ? 'Edit Product' : 'Add Product'}</h2>
        <form onSubmit={submit}>
          <fieldset disabled={saving}>
            <label>Product Name<input autoFocus required maxLength={255} value={form.name} onChange={e => update('name', e.target.value)} /></label>
            <label>Category<select value={form.categoryId} onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value, sizes: null }))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.category}</option>)}
            </select></label>
            <label>Description<textarea maxLength={5000} rows={3} value={form.description} onChange={e => update('description', e.target.value)} /></label>
            <label>Base Price<input type="number" min="0" max="99999999.99" step="0.01" required value={form.price} onChange={e => update('price', e.target.value)} /></label>
            {sizeOptions.length > 0 && <>
              <label className="product-editor-check"><input type="checkbox" checked={!!form.sizes} onChange={e => update('sizes', e.target.checked ? sizeOptions.map(s => ({ label: s.label, size: s.size, price: '' })) : null)} />Use size pricing</label>
              {form.sizes && <div className="product-editor-sizes">{form.sizes.map((size, index) => <label key={size.size}>{size.size} price
                <input type="number" min="0" max="99999999.99" step="0.01" required value={size.price} onChange={e => update('sizes', form.sizes.map((s, i) => i === index ? { ...s, price: e.target.value } : s))} />
              </label>)}</div>}
            </>}
            <label>Image path<input placeholder="/images/products/spanish.png" value={form.image} onChange={e => update('image', e.target.value)} /></label>
            <small>Use an existing image under /images/products/.</small>
            <div className="product-editor-sizes">
              <label>Availability<select value={String(form.inStock)} onChange={e => update('inStock', e.target.value === 'true')}><option value="true">Available</option><option value="false">Unavailable</option></select></label>
              <label>Product Status<select value={String(form.active)} onChange={e => update('active', e.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></select></label>
            </div>
            {error && <p role="alert" className="product-editor-error">{error}</p>}
            <div className="checkout-actions-row">
              <button type="button" className="btn-3d-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-3d-pay">{saving ? 'Saving...' : 'Save Product'}</button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>, document.body
  );
}
