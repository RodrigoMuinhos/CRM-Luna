export type PhotoProvider = () => Promise<Blob | null> | Blob | null | undefined;

declare global {
  interface Window {
    totemGetLatestPhoto?: PhotoProvider;
    __TOTEM_PHOTO__?: Blob;
  }
}

export async function getLatestPhotoBlob(): Promise<Blob | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (window.__TOTEM_PHOTO__ instanceof Blob) {
      const b = window.__TOTEM_PHOTO__;
      window.__TOTEM_PHOTO__ = undefined;
      return b;
    }
    if (typeof window.totemGetLatestPhoto === 'function') {
      const out = await window.totemGetLatestPhoto();
      if (out instanceof Blob) return out;
      return null;
    }
  } catch {
    // ignore
  }
  return null;
}
