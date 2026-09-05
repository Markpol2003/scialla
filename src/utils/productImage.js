export const PRODUCT_IMAGE_FALLBACK = '/images/products/caramelmacc.png';

export function productImageUrl(image) {
  if (image?.startsWith('/images/products/product-')) {
    return (import.meta.env.VITE_API_URL || 'http://localhost:5050').replace(/\/$/, '') + image;
  }
  return image || PRODUCT_IMAGE_FALLBACK;
}

export function productImageFallback(event) {
  const image = event.currentTarget;
  if (image.getAttribute('src') !== PRODUCT_IMAGE_FALLBACK) image.src = PRODUCT_IMAGE_FALLBACK;
}
