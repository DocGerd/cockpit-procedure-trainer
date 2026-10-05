import type { Aircraft, ControlDefinition, ControlPosition, Text } from '../contract';

export type FindingCode =
  | 'unknown-target'
  | 'unplaced-control'
  | 'unplaced-indicator'
  | 'missing-translation'
  | 'phase-without-image'
  | 'phase-without-snapshot'
  | 'undeclared-failure'
  | 'unknown-position';

export type Finding = {
  readonly aircraftId: string;
  readonly code: FindingCode;
  readonly id: string;
  readonly message: string;
};

export type ValidationContext = { readonly [extension: string]: unknown };

export function formatFinding(finding: Finding): string {
  return `${finding.aircraftId}: ${finding.code} ${finding.id}: ${finding.message}`;
}

const isMissing = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

function allows(control: ControlDefinition, position: unknown): boolean {
  return control.positions === 'continuous'
    ? typeof position === 'number'
    : (control.positions as readonly ControlPosition[]).includes(position as ControlPosition);
}

// The context is the extension point for registries the aircraft cannot see.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateAircraft(aircraft: Aircraft, context: ValidationContext = {}): Finding[] {
  const findings: Finding[] = [];
  const add = (code: FindingCode, id: string, message: string) =>
    findings.push({ aircraftId: aircraft.id, code, id, message });

  const controls = Object.entries(aircraft.controls);
  const indicators = Object.entries(aircraft.indicators);
  const views = Object.entries(aircraft.views);
  const hasControl = (id: string) => Object.hasOwn(aircraft.controls, id);
  const hasIndicator = (id: string) => Object.hasOwn(aircraft.indicators, id);
  const hasPhase = (id: string) => Object.hasOwn(aircraft.phases, id);

  const checkText = (id: string, field: string, value: Text | undefined) => {
    for (const language of ['de', 'en'] as const) {
      if (isMissing(value?.[language]))
        add('missing-translation', id, `${field}: empty ${language}`);
    }
  };

  const checkPosition = (id: string, field: string, position: unknown) => {
    const control = aircraft.controls[id];
    if (control && !allows(control, position)) {
      add(
        'unknown-position',
        id,
        `${field}: ${JSON.stringify(position)} is not a position of ${id}`,
      );
    }
  };

  checkText(aircraft.id, 'name', aircraft.name);

  for (const [id, control] of controls) {
    checkText(id, 'name', control.name);
    checkText(id, 'description', control.description);
    if (control.kind === 'guarded') checkText(id, 'guard name', control.guard.name);

    checkPosition(id, 'initial', control.initial);

    if (control.kind === 'rotary' && control.springBack) {
      for (const [detent, rest] of Object.entries(control.springBack)) {
        checkPosition(id, 'springBack key', detent);
        checkPosition(id, 'springBack value', rest);
      }
    }

    const moving =
      control.appearance && 'artwork' in control.appearance
        ? control.appearance.artwork.moving
        : undefined;
    if (moving?.type === 'positions') {
      for (const position of Object.keys(moving.images)) {
        checkPosition(id, 'artwork image key', position);
      }
    }

    const placed = views.some(([, view]) => view.controls && Object.hasOwn(view.controls, id));
    if (!placed) add('unplaced-control', id, 'is not placed in any view');
  }

  for (const [id, indicator] of indicators) {
    checkText(id, 'name', indicator.name);
    const placed = views.some(([, view]) => view.indicators && Object.hasOwn(view.indicators, id));
    if (!placed) add('unplaced-indicator', id, 'is not placed in any view');
  }

  for (const [viewId, view] of views) {
    checkText(viewId, 'name', view.name);
    for (const id of Object.keys(view.controls ?? {})) {
      if (!hasControl(id)) add('unknown-target', id, `view ${viewId} places an unknown control`);
    }
    for (const id of Object.keys(view.indicators ?? {})) {
      if (!hasIndicator(id))
        add('unknown-target', id, `view ${viewId} places an unknown indicator`);
    }
  }

  for (const [failureId, failure] of Object.entries(aircraft.failures)) {
    checkText(failureId, 'name', failure.name);
    for (const id of failure.trips ?? []) {
      if (!hasControl(id)) {
        add('unknown-target', id, `failure ${failureId} trips an unknown control`);
      } else if (aircraft.controls[id]?.kind !== 'breaker') {
        add('unknown-target', id, `failure ${failureId} trips a control that is not a breaker`);
      }
    }
  }

  for (const [phaseId, phase] of Object.entries(aircraft.phases)) {
    checkText(phaseId, 'name', phase.name);
    if (isMissing(phase.image)) add('phase-without-image', phaseId, 'declares no image');

    const entry = phase.entry as Partial<typeof phase.entry> | undefined;
    if (!entry?.controls || entry.state === undefined) {
      add('phase-without-snapshot', phaseId, 'declares no entry snapshot');
      continue;
    }
    for (const [id] of controls) {
      if (!Object.hasOwn(entry.controls, id)) {
        add('phase-without-snapshot', phaseId, `entry snapshot has no position for ${id}`);
      }
    }
    for (const [id, position] of Object.entries(entry.controls)) {
      if (!hasControl(id)) {
        add('unknown-target', id, `phase ${phaseId} entry names an unknown control`);
      } else {
        checkPosition(id, `phase ${phaseId} entry`, position);
      }
    }
  }

  for (const [procedureId, procedure] of Object.entries(aircraft.procedures)) {
    checkText(procedureId, 'title', procedure.title);

    for (const [field, phase] of [
      ['startPhase', procedure.startPhase],
      ['endPhase', procedure.endPhase],
    ] as const) {
      if (phase !== undefined && !hasPhase(phase)) {
        add('unknown-target', phase, `procedure ${procedureId} ${field} is not a phase`);
      }
    }

    if (procedure.type === 'emergency' && !Object.hasOwn(aircraft.failures, procedure.failure)) {
      add(
        'undeclared-failure',
        procedure.failure,
        `procedure ${procedureId} names an undeclared failure`,
      );
    }

    procedure.items.forEach((item, index) => {
      const where = `procedure ${procedureId} item ${index}`;
      checkText(procedureId, `item ${index} text`, item.text);
      if (item.type === 'action') {
        if (!hasControl(item.control)) {
          add('unknown-target', item.control, `${where} targets an unknown control`);
        } else {
          checkPosition(item.control, `${where} position`, item.position);
        }
      } else if (item.type === 'check') {
        if ('indicator' in item.target) {
          if (!hasIndicator(item.target.indicator)) {
            add('unknown-target', item.target.indicator, `${where} checks an unknown indicator`);
          }
        } else if (!hasControl(item.target.control)) {
          add('unknown-target', item.target.control, `${where} checks an unknown control`);
        }
      }
    });
  }

  return findings;
}
