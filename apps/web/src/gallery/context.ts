import { createContext, useContext } from 'react';

export const SIZES = [
  { id: 'compact', name: 'Compact', px: 48 },
  { id: 'small', name: 'Small', px: 80 },
  { id: 'medium', name: 'Medium', px: 128 },
  { id: 'large', name: 'Large', px: 208 },
] as const;

export type PlacementSize = (typeof SIZES)[number];

export type GalleryContextValue = {
  size: PlacementSize;
  threshold: number | undefined;
  report(key: string, sizeId: string, small: boolean): void;
};

export const GalleryContext = createContext<GalleryContextValue>({
  size: SIZES[2],
  threshold: undefined,
  report: () => {},
});

export const useGallery = () => useContext(GalleryContext);
