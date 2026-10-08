import { useId } from 'react';
import type { ReactNode } from 'react';

/** How many items open the list with `inGroup` true. */
export function leadingCount<T>(items: readonly T[], inGroup: (item: T) => boolean): number {
  const end = items.findIndex((item) => !inGroup(item));
  return end === -1 ? items.length : end;
}

/** A labelled run of item rows inside the checklist, such as the memory items an emergency opens with. */
export function ItemGroup({
  kind,
  label,
  children,
}: {
  kind: string;
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <li className="checklist-group" data-group={kind}>
      <span id={id} className="checklist-eyebrow checklist-group-label">
        {label}
      </span>
      <ol className="checklist-group-items" aria-labelledby={id}>
        {children}
      </ol>
    </li>
  );
}
