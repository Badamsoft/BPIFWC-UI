/**
 * Add cache-busting parameter to API URL to prevent aggressive caching on hosts like Hostinger
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_nocache=${Date.now()}`;
}

/**
 * Get WP REST API nonce from global window object
 */
export function getWpNonce(): string {
  return (window as any).wpApiSettings?.nonce || (window as any).pifwcAdmin?.nonce || '';
}

/**
 * Create headers for WP REST API requests with nonce
 */
export function getApiHeaders(): HeadersInit {
  return {
    'X-WP-Nonce': getWpNonce(),
    'Content-Type': 'application/json',
  };
}
