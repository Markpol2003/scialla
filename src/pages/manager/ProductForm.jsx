import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import categories from '../../../shared/catalog.json';
import './ProductForm.css';
import { api } from '../../services/api';
import { productImageUrl, productImageFallback } from '../../utils/productImage';

export default function ProductForm({ product, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: product?.name || '', categoryId: product?.categoryId || categories[0].id,
    description: product?.description || '', price: product?.price ?? '',
    image: product?.image || '', inStock: product?.available ?? product?.inStock ?? true,
    active: product?.active !== false, sizes: product?.sizes || null
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageInput = useRef(null);
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const chooseImage = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (types[file.name.split('.').pop().toLowerCase()] !== file.type || !file.type) {
      setError('Choose a JPG, JPEG, PNG, or WebP image.'); return;
    }
    if (!file.size || file.size > 25 * 1024 * 1024) {
      setError('Choose a non-empty image that is 25 MB or smaller.'); return;
    }
    setError('');
    setImageFile(file);
  };
  const category = categories.find(c => c.id === form.categoryId);
  const sizeOptions = category.items.find(i => i.sizes)?.sizes || [];
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      let image = form.image;
      if (imageFile) {
        try { image = await api.uploadProductImage(imageFile); }
        catch {
          setImageFile(null);
          setError('Image upload failed. Choose another image or save again using the current image or placeholder.');
          return;
        }
        setForm(prev => ({ ...prev, image }));
        setImageFile(null);
      }
      await onSave(product?.id, { ...form, image });
      onClose();
    }
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
            <div className="product-image-upload">
              <label htmlFor="product-image-file">Product Image</label>
              <input ref={imageInput} id="product-image-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={chooseImage} hidden />
              {!imageFile && form.image && <small>Current Image</small>}
              <img className="product-image-preview" src={imagePreview || productImageUrl(form.image)} onError={productImageFallback} alt={imageFile ? 'Selected product image preview' : 'Current product image'} />
              <div className="product-image-actions">
                <button type="button" onClick={() => imageInput.current?.click()}>{imageFile || form.image ? 'Replace Image' : 'Choose Image'}</button>
                {imageFile && <button type="button" onClick={() => setImageFile(null)}>Remove Selection</button>}
              </div>
              {imageFile && <span className="product-image-filename">{imageFile.name}</span>}
              <small>JPG, JPEG, PNG, or WebP. Maximum 25 MB. Uploads when you save.</small>
            </div>
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
