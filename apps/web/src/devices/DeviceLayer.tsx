import type { ReactNode } from 'react';
import type { PanelRects } from '../panel/rects';

export type DeviceLayerProps = { viewId: string; rects: PanelRects };

export const DeviceLayer: (props: DeviceLayerProps) => ReactNode = () => null;
