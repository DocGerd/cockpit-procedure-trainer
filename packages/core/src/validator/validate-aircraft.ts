import { isPhaseId, isPosition, phaseOrder } from '../contract';
import type {
  Aircraft,
  Appearance,
  ControlDefinition,
  ControlPosition,
  Device,
  GuardedControl,
  Rect,
  Text,
  ViewSize,
} from '../contract';

export type FindingCode =
  | 'unknown-target'
  | 'unplaced-control'
  | 'unplaced-indicator'
  | 'missing-translation'
  | 'missing-phase'
  | 'unknown-phase'
  | 'phase-without-image'
  | 'running-image-without-engine'
  | 'phase-without-running-image'
  | 'cue-without-image'
  | 'phase-without-snapshot'
  | 'undeclared-failure'
  | 'unknown-position'
  | 'inexact-lever-target'
  | 'unknown-device'
  | 'unknown-device-control'
  | 'unknown-device-state'
  | 'unplaced-device'
  | 'invalid-install-id'
  | 'control-in-device-namespace'
  | 'invalid-view-size'
  | 'placement-outside-view'
  | 'invalid-cockpit-size'
  | 'missing-cockpit-view'
  | 'unknown-cockpit-view'
  | 'invalid-cockpit-cell-rect'
  | 'cockpit-cell-outside'
  | 'cockpit-cells-overlap'
  | 'invalid-cockpit-min-width'
  | 'invalid-cockpit-dock'
  | 'artwork-glass-size'
  | 'invalid-check-response'
  | 'invalid-flow'
  | 'invalid-memory';

export type Finding = {
  readonly aircraftId: string;
  readonly code: FindingCode;
  readonly id: string;
  readonly message: string;
};

export type ImageSize = { readonly width: number; readonly height: number };

export type ValidationContext = {
  readonly devices?: readonly Device[];
  /** The pixel size of an image URL, where the caller can read it; artwork sizes are checked only then. */
  readonly imageSize?: (url: string) => ImageSize | undefined;
  readonly [extension: string]: unknown;
};

export function formatFinding(finding: Finding): string {
  return `${finding.aircraftId}: ${finding.code} ${finding.id}: ${finding.message}`;
}

const kindOf = (value: unknown): string =>
  value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

const isMissing = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

/** A rect with finite x and y and a positive, finite w and h. */
export function isUsableRect(rect: unknown): rect is Rect {
  const { x, y, w, h } = (rect ?? {}) as Record<string, unknown>;
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  return finite(x) && finite(y) && finite(w) && finite(h) && (w as number) > 0 && (h as number) > 0;
}

// The context carries registries the aircraft cannot see.
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
  const installs = Object.entries(aircraft.devices ?? {});
  const registry = context.devices ?? [];
  const deviceById = (id: string) => registry.find((candidate) => candidate.id === id);

  const checkText = (id: string, field: string, value: Text | undefined) => {
    for (const language of ['de', 'en'] as const) {
      if (isMissing(value?.[language]))
        add('missing-translation', id, `${field}: empty ${language}`);
    }
  };

  const checkPosition = (id: string, field: string, position: unknown) => {
    const control = aircraft.controls[id];
    if (control && !isPosition(control, position)) {
      add(
        'unknown-position',
        id,
        `${field}: ${JSON.stringify(position)} is not a position of ${id}`,
      );
    }
  };

  const checkActionStop = (
    id: string,
    where: string,
    control: ControlDefinition,
    position: unknown,
  ) => {
    if (
      control.positions === 'continuous' &&
      isPosition(control, position) &&
      position !== 0 &&
      position !== 1
    ) {
      add(
        'inexact-lever-target',
        id,
        `${where} targets ${String(position)} on a continuous lever; target 0 or 1, or use a check item with a condition, or give the lever named notches`,
      );
    }
  };

  const checkDeviceTarget = (id: string, where: string, position?: unknown, action = false) => {
    const install = installs.find(
      ([installId]) => !installId.includes('.') && id.startsWith(`${installId}.`),
    );
    if (!install) {
      add('unknown-device', id, `${where} targets a control of an install the aircraft lacks`);
      return;
    }
    const [installId, { device: deviceId }] = install;
    const device = deviceById(deviceId);
    if (!device) return;
    const controlId = id.slice(installId.length + 1);
    checkDeviceControl(id, device, controlId, where, position, action);
  };

  const checkDeviceControl = (
    id: string,
    device: Device,
    controlId: string,
    where: string,
    position?: unknown,
    action = false,
  ) => {
    const control = Object.hasOwn(device.controls, controlId)
      ? device.controls[controlId]
      : undefined;
    if (!control) {
      add('unknown-device-control', id, `${where} targets a control ${device.id} does not have`);
    } else if (position !== undefined && !isPosition(control, position)) {
      add(
        'unknown-position',
        id,
        `${where} position: ${JSON.stringify(position)} is not a position of ${id}`,
      );
    } else if (action) {
      checkActionStop(id, where, control, position);
    }
  };

  const checkControlTarget = (id: string, where: string, position?: unknown, action = false) => {
    if (hasControl(id)) {
      if (position !== undefined) checkPosition(id, `${where} position`, position);
      const control = aircraft.controls[id];
      if (action && control) checkActionStop(id, where, control, position);
    } else if (id.includes('.')) {
      checkDeviceTarget(id, where, position, action);
    } else {
      add('unknown-target', id, `${where} targets an unknown control`);
    }
  };

  const checkGuardText = (id: string, guard: GuardedControl['guard']) => {
    checkText(id, 'guard name', guard.name);
    for (const position of ['open', 'closed'] as const) {
      const legend = guard.legends?.[position];
      if (!legend) continue;
      checkText(id, `guard legend of ${position}`, legend.state);
      checkText(id, `guard act of ${position}`, legend.act);
    }
  };

  const checkGuardTarget = (id: string, where: string, position: unknown) => {
    if (!hasControl(id) || aircraft.controls[id]?.kind !== 'guarded') {
      add('unknown-target', id, `${where} guards a control without a guard`);
    } else if (position !== 'open' && position !== 'closed') {
      add('unknown-position', id, `${where} has no guard position ${JSON.stringify(position)}`);
    }
  };

  const checkGlass = (id: string, appearance: Appearance | undefined) => {
    if (!appearance || !('artwork' in appearance) || !context.imageSize) return;
    const { face, glass } = appearance.artwork;
    if (glass === undefined) return;
    const faceSize = context.imageSize(face);
    const glassSize = context.imageSize(glass);
    if (!faceSize || !glassSize) return;
    if (faceSize.width !== glassSize.width || faceSize.height !== glassSize.height) {
      const format = ({ width, height }: ImageSize) => `${width}x${height}`;
      add(
        'artwork-glass-size',
        id,
        `glass is ${format(glassSize)}, its face ${format(faceSize)}; both must match`,
      );
    }
  };

  checkText(aircraft.id, 'name', aircraft.name);
  checkText(aircraft.id, 'handbookRevision', aircraft.handbookRevision);

  for (const [id, control] of controls) {
    checkText(id, 'name', control.name);
    checkText(id, 'description', control.description);
    if (control.kind === 'guarded') checkGuardText(id, control.guard);

    if (control.kind === 'breaker' && JSON.stringify(control.positions) !== '["in","pulled"]') {
      add(
        'unknown-position',
        id,
        `positions: ${JSON.stringify(control.positions)} must be exactly ["in","pulled"]`,
      );
    }

    checkPosition(id, 'initial', control.initial);

    if (control.kind === 'rotary' && control.springBack) {
      for (const [detent, rest] of Object.entries(control.springBack)) {
        checkPosition(id, 'springBack key', detent);
        checkPosition(id, 'springBack value', rest);
      }
    }

    for (const [position, legend] of Object.entries(control.legends ?? {})) {
      checkPosition(id, 'legends key', position);
      if (typeof legend === 'string') {
        if (isMissing(legend)) add('missing-translation', id, `legend of ${position}: empty`);
      } else {
        checkText(id, `legend of ${position}`, legend.state);
        checkText(id, `restore legend of ${position}`, legend.restore);
      }
    }

    for (const { control: by, at, holds } of control.interlock ?? []) {
      for (const held of holds) checkPosition(id, 'interlock holds', held);
      if (by === id) add('unknown-target', by, `the interlock of ${id} names ${id} itself`);
      else if (hasControl(by)) checkPosition(by, `interlock of ${id}`, at);
      else add('unknown-target', by, `the interlock of ${id} names an unknown control`);
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

    checkGlass(id, control.appearance);

    const placed = views.some(([, view]) => view.controls && Object.hasOwn(view.controls, id));
    if (!placed) add('unplaced-control', id, 'is not placed in any view');

    if (installs.some(([installId]) => id.startsWith(`${installId}.`))) {
      add('control-in-device-namespace', id, 'starts with the id of a device install');
    }
  }

  for (const [id, indicator] of indicators) {
    checkText(id, 'name', indicator.name);
    checkGlass(id, indicator.appearance);
    const placed = views.some(([, view]) => view.indicators && Object.hasOwn(view.indicators, id));
    if (!placed) add('unplaced-indicator', id, 'is not placed in any view');
  }

  const isLength = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;
  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const sizes = new Map<string, ViewSize | undefined>();
  const declaredSize = (viewId: string, size: unknown) => {
    if (size === undefined) return undefined;
    const { width, height } = (size ?? {}) as { width?: unknown; height?: unknown };
    if (isLength(width) && isLength(height)) return { width, height } as ViewSize;
    add('invalid-view-size', viewId, 'size must be a positive, finite width and height');
    return undefined;
  };
  const checkInside = (viewId: string, size: ViewSize | undefined, id: string, rect: Rect) => {
    if (
      size &&
      (rect.x < 0 || rect.y < 0 || rect.x + rect.w > size.width || rect.y + rect.h > size.height)
    ) {
      add(
        'placement-outside-view',
        id,
        `view ${viewId} places it outside its ${size.width}x${size.height} size`,
      );
    }
  };

  for (const [viewId, view] of views) {
    checkText(viewId, 'name', view.name);
    const size = declaredSize(viewId, view.size);
    sizes.set(viewId, size);
    for (const [id, placement] of Object.entries(view.controls ?? {})) {
      if (placement) checkInside(viewId, size, id, placement.rect);
    }
    for (const [id, placement] of Object.entries(view.indicators ?? {})) {
      if (placement) checkInside(viewId, size, id, placement.rect);
    }
    for (const id of Object.keys(view.controls ?? {})) {
      if (!hasControl(id)) add('unknown-target', id, `view ${viewId} places an unknown control`);
    }
    for (const id of Object.keys(view.indicators ?? {})) {
      if (!hasIndicator(id))
        add('unknown-target', id, `view ${viewId} places an unknown indicator`);
    }
  }

  if (aircraft.cockpit !== undefined) {
    const {
      size: cockpitSize,
      views: cells,
      dock,
    } = aircraft.cockpit as {
      size?: unknown;
      dock?: { rect?: Rect; minWidth?: unknown } | null;
      views?: Readonly<Record<string, { rect?: Rect; minWidth?: unknown } | null | undefined>>;
    };
    const { width, height } = (cockpitSize ?? {}) as { width?: unknown; height?: unknown };
    const bounds =
      isLength(width) && isLength(height) ? ({ width, height } as ViewSize) : undefined;
    if (!bounds) {
      add('invalid-cockpit-size', 'cockpit', 'size must be a positive, finite width and height');
    }

    const placed = Object.entries(cells ?? {});
    for (const [viewId] of views) {
      if (!placed.some(([id]) => id === viewId)) {
        add('missing-cockpit-view', viewId, 'has no cell in the cockpit arrangement');
      }
    }
    for (const [viewId, cell] of placed) {
      if (!Object.hasOwn(aircraft.views, viewId)) {
        add('unknown-cockpit-view', viewId, 'has a cockpit cell but is not a view');
      }
      if (!isLength(cell?.minWidth)) {
        add('invalid-cockpit-min-width', viewId, 'minWidth must be a positive, finite number');
      }
      const rect = isUsableRect(cell?.rect) ? cell?.rect : undefined;
      if (!rect) {
        add(
          'invalid-cockpit-cell-rect',
          viewId,
          'rect needs a finite x and y and a positive, finite w and h',
        );
      } else if (bounds) {
        if (
          rect.x < 0 ||
          rect.y < 0 ||
          rect.x + rect.w > bounds.width ||
          rect.y + rect.h > bounds.height
        ) {
          add(
            'cockpit-cell-outside',
            viewId,
            `cell lies outside the ${bounds.width}x${bounds.height} arrangement`,
          );
        }
      }
    }
    if (dock === undefined) {
      add('invalid-cockpit-dock', 'dock', 'the cockpit arrangement needs a dock cell');
    } else {
      const dockRect = isUsableRect(dock?.rect) ? dock?.rect : undefined;
      const flawed = (reason: string) => add('invalid-cockpit-dock', 'dock', reason);
      if (!isLength(dock?.minWidth)) flawed('minWidth must be a positive, finite number');
      if (!dockRect) {
        flawed('rect needs a finite x and y and a positive, finite w and h');
      } else {
        if (
          bounds &&
          (dockRect.x < 0 ||
            dockRect.y < 0 ||
            dockRect.x + dockRect.w > bounds.width ||
            dockRect.y + dockRect.h > bounds.height)
        ) {
          flawed(`dock lies outside the ${bounds.width}x${bounds.height} arrangement`);
        }
        for (const [viewId, cell] of placed) {
          const other = isUsableRect(cell?.rect) ? cell?.rect : undefined;
          if (other && overlaps(dockRect, other)) flawed(`dock overlaps the cell of ${viewId}`);
        }
      }
    }
    placed.forEach(([firstId, first], index) => {
      for (const [secondId, second] of placed.slice(index + 1)) {
        const a = isUsableRect(first?.rect) ? first?.rect : undefined;
        const b = isUsableRect(second?.rect) ? second?.rect : undefined;
        if (a && b && overlaps(a, b)) {
          add(
            'cockpit-cells-overlap',
            firstId,
            `cell of ${firstId} overlaps the cell of ${secondId}`,
          );
        }
      }
    });
  }

  const named = new Set<string>();
  for (const [installId, install] of installs) {
    if (installId.includes('.')) {
      add('invalid-install-id', installId, 'an install id must not contain a dot');
    }
    const device = deviceById(install.device);
    if (device && !named.has(device.id)) {
      named.add(device.id);
      checkText(device.id, 'manual', device.manual);
      device.notModelled.forEach((entry, index) =>
        checkText(device.id, `notModelled ${index}`, entry),
      );
      for (const [controlId, control] of Object.entries(device.controls)) {
        checkText(`${device.id}.${controlId}`, 'name', control.name);
        checkText(`${device.id}.${controlId}`, 'description', control.description);
        if (control.kind === 'guarded') checkGuardText(`${device.id}.${controlId}`, control.guard);
      }
    }
    if (!device) {
      add('unknown-device', install.device, `install ${installId} names an unregistered device`);
    }
    if (!Object.hasOwn(aircraft.views, install.view)) {
      add('unplaced-device', installId, `is placed in ${install.view}, which is not a view`);
    } else {
      checkInside(install.view, sizes.get(install.view), installId, install.placement.rect);
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

  for (const phaseId of phaseOrder) {
    if (!hasPhase(phaseId))
      add('missing-phase', phaseId, 'declares no entry for this shared phase');
  }

  for (const [cueId, cue] of Object.entries(aircraft.outsideCues ?? {})) {
    checkText(cueId, 'name', cue.name);
    if (isMissing(cue.image)) add('cue-without-image', cueId, 'declares no image');
  }

  for (const [phaseId, phase] of Object.entries(aircraft.phases)) {
    if (!isPhaseId(phaseId)) add('unknown-phase', phaseId, 'is not a shared phase');
    if (isMissing(phase.image)) add('phase-without-image', phaseId, 'declares no image');
    if (phase.imageRunning === undefined && aircraft.engineRunning !== undefined) {
      add(
        'phase-without-running-image',
        phaseId,
        'declares no running image although the aircraft declares engineRunning',
      );
    }
    if (phase.imageRunning !== undefined) {
      if (isMissing(phase.imageRunning)) {
        add('phase-without-image', phaseId, 'declares an empty running image');
      }
      if (aircraft.engineRunning === undefined) {
        add(
          'running-image-without-engine',
          phaseId,
          'declares a running image but no engineRunning',
        );
      }
    }

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
    for (const [id, position] of Object.entries(entry.guards ?? {})) {
      checkGuardTarget(id, `phase ${phaseId} entry`, position);
    }
    for (const [installId, positions] of Object.entries(entry.devices ?? {})) {
      const install = Object.hasOwn(aircraft.devices ?? {}, installId)
        ? aircraft.devices?.[installId]
        : undefined;
      if (!install) {
        add('unknown-device', installId, `phase ${phaseId} entry names an unknown install`);
        continue;
      }
      const device = deviceById(install.device);
      if (!device) continue;
      for (const [controlId, position] of Object.entries(positions)) {
        checkDeviceControl(
          `${installId}.${controlId}`,
          device,
          controlId,
          `phase ${phaseId} entry`,
          position,
        );
      }
    }

    for (const [installId, fields] of Object.entries(entry.deviceStates ?? {})) {
      const install = Object.hasOwn(aircraft.devices ?? {}, installId)
        ? aircraft.devices?.[installId]
        : undefined;
      if (!install) {
        add('unknown-device', installId, `phase ${phaseId} entry seeds an unknown install`);
        continue;
      }
      const device = deviceById(install.device);
      if (!device) continue;
      const initial = device.initial as Readonly<Record<string, unknown>>;
      for (const [field, value] of Object.entries(fields)) {
        const where = `phase ${phaseId} entry seeds ${installId}`;
        if (!Object.hasOwn(initial, field)) {
          add(
            'unknown-device-state',
            `${installId}.${field}`,
            `${where} with a field ${device.id} state does not have`,
          );
        } else if (initial[field] !== null && kindOf(value) !== kindOf(initial[field])) {
          add(
            'unknown-device-state',
            `${installId}.${field}`,
            `${where} with a ${kindOf(value)} where ${device.id} state has a ${kindOf(initial[field])}`,
          );
        }
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

    const verifies = (
      later: (typeof procedure.items)[number],
      control: string,
      position: ControlPosition,
    ): boolean =>
      (later as { readonly flow?: unknown }).flow !== true &&
      (later.type === 'action'
        ? later.control === control && later.position === position
        : later.type === 'check' &&
          later.target !== undefined &&
          'control' in later.target &&
          later.target.control === control);

    let checklistStarted = false;
    let recallEnded = false;
    procedure.items.forEach((item, index) => {
      const where = `procedure ${procedureId} item ${index}`;
      checkText(procedureId, `item ${index} text`, item.text);
      if ((item as { readonly flow?: unknown }).flow !== true) {
        checklistStarted = true;
      } else if (procedure.type !== 'normal') {
        add('invalid-flow', procedureId, `${where} is in a flow; only a normal procedure has one`);
      } else if (item.type !== 'action') {
        add('invalid-flow', procedureId, `${where} is in a flow, which holds only action items`);
      } else if (checklistStarted) {
        add('invalid-flow', procedureId, `${where} is in a flow, which must be at the start`);
      } else if (!procedure.items.some((later) => verifies(later, item.control, item.position))) {
        // A flow item latches, so only a later checklist item catches its control moved back.
        add('invalid-flow', procedureId, `${where} is in a flow, but no later item verifies it`);
      }
      if (item.memory !== true) {
        recallEnded = true;
      } else if (procedure.type !== 'emergency') {
        add('invalid-memory', procedureId, `${where} is a memory item; only an emergency has them`);
      } else if (recallEnded) {
        add(
          'invalid-memory',
          procedureId,
          `${where} is a memory item, which must lead the procedure`,
        );
      }
      if (item.type === 'action') {
        checkControlTarget(item.control, where, item.position, true);
      } else if (item.type === 'guard') {
        checkGuardTarget(item.control, where, item.position);
      } else if (item.type === 'check') {
        const checked = item.target;
        if (checked === undefined) {
          if (item.response !== undefined) {
            add(
              'invalid-check-response',
              procedureId,
              `${where} asks for a reading but has nothing on the panel to read`,
            );
          }
          return;
        }
        const target = 'indicator' in checked ? checked.indicator : checked.control;
        if ('indicator' in checked) {
          if (!hasIndicator(checked.indicator)) {
            add('unknown-target', checked.indicator, `${where} checks an unknown indicator`);
          }
        } else {
          checkControlTarget(checked.control, where);
        }
        const tolerance = item.response?.tolerance;
        if (tolerance !== undefined && !(Number.isFinite(tolerance) && tolerance >= 0)) {
          add(
            'invalid-check-response',
            target,
            `${where} needs a finite response tolerance of at least 0`,
          );
        }
      }
    });
  }

  return findings;
}
