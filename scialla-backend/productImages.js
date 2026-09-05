const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');

const IMAGE_DIRECTORY = path.resolve(__dirname, '../public/images/products');
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function imageExtension(filename, mime) {
  if (typeof filename !== 'string' || /[/\\\0]/.test(filename)) throw new Error('Invalid image filename.');
  const extension = path.extname(filename).toLowerCase();
  if (!types[extension] || types[extension] !== mime) throw new Error('Choose a JPG, JPEG, PNG, or WebP image.');
  return extension;
}

function validateImage(buffer, extension) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Choose a non-empty image file.');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image must be 25 MB or smaller.');
  const valid = extension === '.png'
    ? buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : extension === '.webp'
      ? buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
      : buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (!valid) throw new Error('Image contents do not match the selected file type.');
}

function registerProductImages(app, { verifyToken, verifyManager }, directory = IMAGE_DIRECTORY) {
  app.use('/images/products', express.static(directory, {
    fallthrough: true,
    setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
  }));
  app.post('/api/products/images', verifyToken, verifyManager, (req, res, next) => {
    try {
      req.imageExtension = imageExtension(req.query.filename, req.get('Content-Type'));
      next();
    } catch (error) { res.status(400).json({ success: false, message: error.message }); }
  }, express.raw({ type: () => true, limit: MAX_IMAGE_BYTES, inflate: false }), async (req, res) => {
    try { validateImage(req.body, req.imageExtension); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    const filename = `product-${Date.now()}-${randomUUID()}${req.imageExtension}`;
    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, filename), req.body, { flag: 'wx' });
      return res.status(201).json({ success: true, image: `/images/products/${filename}` });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to upload image. Please try again.' });
    }
  }, (error, req, res, _next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Image must be 25 MB or smaller.' });
    return res.status(400).json({ success: false, message: 'Unable to read image upload.' });
  });
}

module.exports = { registerProductImages, imageExtension, validateImage, MAX_IMAGE_BYTES };
