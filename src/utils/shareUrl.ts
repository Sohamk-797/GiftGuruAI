/**
 * Utility for building share URLs
 * Uses FRONTEND_BASE_URL env var in production, falls back to window.location.origin in dev
 */

export const getBaseUrl = (): string => {
  // Check for VITE_FRONTEND_BASE_URL env var (set in production)
  const envBaseUrl = import.meta.env.VITE_FRONTEND_BASE_URL;
  
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fallback to current origin in development
  return window.location.origin;
};

export const buildGiftShareUrl = (giftId: string): string => {
  const base = getBaseUrl();
  return `${base}/gift/${encodeURIComponent(giftId)}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};
