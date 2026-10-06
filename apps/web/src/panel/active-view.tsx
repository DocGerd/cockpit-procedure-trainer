import { createContext, useContext } from 'react';

export type ActiveView = {
  readonly viewId: string;
  /** Whether every view is on screen at once; `setView` then has nothing to switch. */
  readonly combined: boolean;
  setView(viewId: string): void;
  /** Whether the view is on screen: only the selected one in tabs, every one in the combined layout. */
  visible(viewId: string): boolean;
};

export const ActiveViewContext = createContext<ActiveView | undefined>(undefined);

/** The panel's shown view. Available inside `PanelArea`, e.g. in `PanelOverlay` and `DeviceLayer`. */
export function useActiveView(): ActiveView {
  const value = useContext(ActiveViewContext);
  if (!value) throw new Error('useActiveView needs a PanelArea');
  return value;
}
