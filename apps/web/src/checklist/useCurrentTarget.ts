import { useSessionState } from '../trainer';

export type CurrentTarget = { readonly control: string } | { readonly indicator: string };

export function useCurrentTarget(): CurrentTarget | undefined {
  return useSessionState((snapshot): CurrentTarget | undefined => {
    const checklist = snapshot.checklist();
    if (!checklist || checklist.done) return undefined;
    const item = checklist.procedure.items[checklist.current];
    if (item?.type === 'action') return { control: item.control };
    if (item?.type === 'check') return item.target;
    return undefined;
  });
}
