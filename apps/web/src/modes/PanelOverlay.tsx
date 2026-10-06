import type { ReactNode } from 'react';
import type { PanelRects } from '../panel/rects';

export type PanelOverlayProps = { viewId: string; rects: PanelRects };

export const PanelOverlay: (props: PanelOverlayProps) => ReactNode = () => null;
