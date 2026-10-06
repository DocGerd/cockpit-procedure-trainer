import { createContext, useContext } from 'react';

export type ActiveView = { readonly viewId: string; setView(viewId: string): void };

export const ActiveViewContext = createContext<ActiveView | undefined>(undefined);

/** The panel's shown view. Available inside `PanelArea`, e.g. in `PanelOverlay` and `DeviceLayer`. */
export function useActiveView(): ActiveView {
  const value = useContext(ActiveViewContext);
  if (!value) throw new Error('useActiveView needs a PanelArea');
  return value;
}
