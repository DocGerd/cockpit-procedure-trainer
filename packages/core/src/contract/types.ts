export type Text = { readonly de: string; readonly en: string };

export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

export type Point = { readonly x: number; readonly y: number };
export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};
export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

export type WidgetAppearance = {
  readonly widget: string;
  readonly options?: JsonObject;
};

export type MovingPart =
  | {
      readonly type: 'needle';
      readonly image: string;
      readonly pivot: Point;
      readonly angleRange: { readonly min: number; readonly max: number };
      readonly valueRange: { readonly min: number; readonly max: number };
    }
  | { readonly type: 'positions'; readonly images: { readonly [position: string]: string } }
  | { readonly type: 'travel'; readonly image: string; readonly path: readonly Point[] };

export type ArtworkAppearance = {
  readonly artwork: {
    readonly face: string;
    readonly moving: MovingPart;
    /** Glass drawn above the moving part and never moved, so its glare lies over the needle; the face's size. */
    readonly glass?: string;
    /** The text the face image prints, so a check can see that the control is labelled. */
    readonly lettering?: readonly string[];
  };
  readonly options?: JsonObject;
};

export type Appearance = WidgetAppearance | ArtworkAppearance;

export type ControlPosition = string | number;
export type Positions = { readonly [id: string]: ControlPosition };

export type BreakerPosition = 'in' | 'pulled';
export type GuardPosition = 'closed' | 'open';

/**
 * A mechanical lock by another control: while `control` stands at `at`, the pilot cannot move this
 * control from a position in `holds` to one outside it, as a closed fuel valve covering the key slot
 * keeps the key at OFF. It never moves either control, and this control stays free while it stands
 * outside `holds`.
 */
export type ControlInterlock = {
  readonly control: string;
  readonly at: ControlPosition;
  readonly holds: readonly string[];
};

type ControlBase = {
  readonly name: Text;
  readonly description: Text;
  /** The panel's own short function legend beside the control, such as BAT or FUEL; it does not follow the UI language. */
  readonly placard?: string;
  readonly appearance?: Appearance;
  /** Every lock that applies; a move is refused when any of them refuses it. */
  readonly interlock?: readonly ControlInterlock[];
};

export type ToggleControl = ControlBase & {
  readonly kind: 'toggle';
  readonly positions: readonly string[];
  readonly initial: string;
};

export type RotaryControl = ControlBase & {
  readonly kind: 'rotary';
  readonly positions: readonly string[];
  readonly initial: string;
  readonly springBack?: { readonly [detent: string]: string };
};

export type LeverControl = ControlBase & { readonly kind: 'lever' } & (
    | { readonly positions: 'continuous'; readonly initial: number }
    | { readonly positions: readonly string[]; readonly initial: string }
  );

export type MomentaryControl = ControlBase & {
  readonly kind: 'momentary';
  readonly positions: readonly [rest: string, held: string];
  readonly initial: string;
};

export type GuardedControl = ControlBase & {
  readonly kind: 'guarded';
  readonly positions: readonly string[];
  readonly initial: string;
  readonly guard: { readonly name: Text };
};

export type BreakerControl = ControlBase & {
  readonly kind: 'breaker';
  readonly positions: readonly ['in', 'pulled'];
  readonly initial: BreakerPosition;
};

export type ControlDefinition =
  ToggleControl | RotaryControl | LeverControl | MomentaryControl | GuardedControl | BreakerControl;

export type ControlKind = ControlDefinition['kind'];

export type ControlChange<C extends string = string> = {
  readonly id: C;
  readonly source: 'pilot' | 'spring' | 'system';
} & (
  | { readonly kind: 'position'; readonly from: ControlPosition; readonly to: ControlPosition }
  | { readonly kind: 'guard'; readonly from: GuardPosition; readonly to: GuardPosition }
);

export type DeviceState<D = unknown> = { readonly on: boolean; readonly state: D };

export type TrainerState<S> = {
  readonly controls: Positions;
  readonly systems: S;
  readonly devices: Readonly<Record<string, DeviceState>>;
};

export type Condition<S> = (state: TrainerState<S>) => boolean;

export type IndicatorValue = number | boolean | string;

export type IndicatorDefinition<S> = {
  readonly name: Text;
  readonly select: (state: TrainerState<S>) => IndicatorValue;
  readonly appearance: Appearance;
};

export type Placement = {
  readonly rect: Rect;
  /** The text the view image prints beside this placement; a widget then prints no placard of its own. */
  readonly printed?: readonly string[];
  readonly position3d?: Vec3;
  readonly orientation?: Vec3;
};

export type ViewSize = { readonly width: number; readonly height: number };

export type ViewDefinition<C extends string, I extends string> = {
  readonly name: Text;
  readonly image: string;
  /** The coordinate space of the placements, with its origin at 0,0. Without it the renderer reads the image. */
  readonly size?: ViewSize;
  readonly controls?: { readonly [K in C]?: Placement };
  readonly indicators?: { readonly [K in I]?: Placement };
};

export type CockpitCell = {
  /** Where the view sits in the cockpit arrangement; the view is contain-fit inside it. */
  readonly rect: Rect;
  /** Narrowest rendered width, in CSS px, at which the view stays legible and operable. Owned by the floor test. */
  readonly minWidth: number;
};

export type CockpitLayout<V extends string> = {
  /** The arrangement's coordinate space, origin 0,0. Its unit is the author's; only proportions matter. */
  readonly size: ViewSize;
  readonly views: { readonly [K in V]: CockpitCell };
  /** Where the device dock sits; its `minWidth` is at least the widest device floor. Not a view. */
  readonly dock: CockpitCell;
};

export type Environment = {
  readonly airspeedKt: number;
  readonly altitudeFt: number;
  readonly onGround: boolean;
};

export type StepInput<F extends string = string> = {
  readonly controls: Positions;
  readonly failures: ReadonlySet<F>;
  readonly environment: Environment;
  readonly dtMs: number;
};

export type SystemsDefinition<S, F extends string = string> = {
  readonly initial: S;
  step(state: S, input: StepInput<F>): S;
};

export type DeviceStepInput = {
  readonly controls: Positions;
  readonly powered: boolean;
  readonly inputs: { readonly [name: string]: IndicatorValue };
  readonly dtMs: number;
};

export type DeviceDefinition<D, DC extends ControlRecord = ControlRecord> = {
  readonly id: string;
  readonly manual: Text;
  readonly notModelled: readonly Text[];
  readonly controls: DC & ControlRules<DC>;
  readonly initial: D;
  step(state: D, input: DeviceStepInput): D;
};

export type Device = DeviceDefinition<unknown>;

export type DeviceInstall<S, V extends string = string> = {
  readonly device: string;
  readonly view: V;
  readonly placement: Placement;
  readonly powered: Condition<S>;
  readonly inputs: { readonly [name: string]: (state: TrainerState<S>) => IndicatorValue };
};

export type FailureDefinition<B extends string = string> = {
  readonly name: Text;
  readonly trips?: readonly B[];
};

export type ControlRecord = { readonly [id: string]: ControlDefinition };

export type ControlId<CT extends ControlRecord> = keyof NoInfer<CT> & string;

export type GuardedId<CT extends ControlRecord> = string extends keyof CT
  ? string
  : {
      [K in ControlId<CT>]: NoInfer<CT>[K] extends { readonly kind: 'guarded' } ? K : never;
    }[ControlId<CT>];

export type PositionOf<D extends ControlDefinition> = D extends { readonly kind: 'breaker' }
  ? BreakerPosition
  : D extends { readonly positions: 'continuous' }
    ? number
    : D extends { readonly positions: readonly (infer P)[] }
      ? P
      : never;

export type BreakerId<CT extends ControlRecord> = string extends keyof CT
  ? string
  : {
      [K in keyof CT & string]: CT[K] extends { readonly kind: 'breaker' } ? K : never;
    }[keyof CT & string];

type PositionError<Got, Valid> = {
  readonly invalidPosition: Got;
  readonly validPositions: Valid;
};

type CheckPosition<Got, Valid, Then = unknown> = [Got] extends [Valid]
  ? Then
  : PositionError<Got, Valid>;

type PositionRules<D> = D extends { readonly positions: readonly (infer P extends string)[] }
  ? (D extends { readonly initial: infer I }
      ? { readonly initial: CheckPosition<I, P> }
      : unknown) &
      (D extends { readonly springBack: infer SB }
        ? {
            readonly springBack: {
              readonly [K in keyof SB]: CheckPosition<K, P, CheckPosition<SB[K], P>>;
            };
          }
        : unknown) &
      (D extends {
        readonly appearance: {
          readonly artwork: {
            readonly moving: { readonly type: 'positions'; readonly images: infer Images };
          };
        };
      }
        ? {
            readonly appearance: {
              readonly artwork: {
                readonly moving: {
                  readonly images: { readonly [K in P]: string } & {
                    readonly [K in keyof Images]: CheckPosition<K, P>;
                  };
                };
              };
            };
          }
        : unknown)
  : unknown;

export type ControlRules<CT extends ControlRecord> = string extends keyof CT
  ? unknown
  : { readonly [K in keyof NoInfer<CT>]: PositionRules<NoInfer<CT>[K]> };

export type PhaseDefinition<S, CT extends ControlRecord = ControlRecord> = {
  readonly name: Text;
  /** The outside view; with `imageRunning` set, the view while the engine is stopped. */
  readonly image: string;
  /** The outside view while `engineRunning` holds, with the propeller disc in place of the blade. */
  readonly imageRunning?: string;
  readonly environment: Environment;
  readonly entry: {
    readonly controls: { readonly [K in ControlId<CT>]: PositionOf<NoInfer<CT>[K]> };
    readonly state: S;
    /** Guards not named here are closed on entry. */
    readonly guards?: { readonly [K in GuardedId<CT>]?: GuardPosition };
    readonly devices?: {
      readonly [installId: string]: { readonly [controlId: string]: ControlPosition };
    };
    /** Fields of an install's device state laid over `device.initial` on entry, keyed by install id. */
    readonly deviceStates?: {
      readonly [installId: string]: { readonly [field: string]: unknown };
    };
  };
};

type ItemBase = { readonly text: Text };

export type DeviceControlId = `${string}.${string}`;

/**
 * An action with `flow` belongs to the flow a normal procedure may open with: its actions are done
 * from memory in any order, and the checklist items after the flow verify them.
 */
export type ActionItem<S, CT extends ControlRecord = ControlRecord> = ItemBase & {
  readonly flow?: true;
} & (
    | {
        [K in ControlId<CT>]: {
          readonly type: 'action';
          readonly control: K;
          readonly position: PositionOf<NoInfer<CT>[K]>;
          readonly holdUntil?: Condition<S>;
        };
      }[ControlId<CT>]
    | {
        readonly type: 'action';
        readonly control: DeviceControlId;
        readonly position: ControlPosition;
        readonly holdUntil?: Condition<S>;
      }
  );

export type CheckItem<
  S,
  CT extends ControlRecord = ControlRecord,
  I extends string = string,
> = ItemBase & {
  readonly type: 'check';
  readonly target:
    { readonly indicator: I } | { readonly control: ControlId<CT> | DeviceControlId };
  readonly condition: Condition<S>;
  /** Lets the pilot answer with the value read; a reading off by more than the tolerance is unmet. */
  readonly response?: {
    readonly reading: (state: TrainerState<S>) => number;
    readonly tolerance: number;
    readonly unit?: Text;
  };
};

export type ConfirmItem = ItemBase & { readonly type: 'confirm' };

export type ProcedureItem<S, CT extends ControlRecord = ControlRecord, I extends string = string> =
  ActionItem<S, CT> | CheckItem<S, CT, I> | ConfirmItem;

export type ProcedureDefinition<
  S,
  CT extends ControlRecord = ControlRecord,
  I extends string = string,
  F extends string = string,
  P extends string = string,
> = {
  readonly title: Text;
  readonly startPhase: P;
  readonly endPhase?: P;
  readonly items: readonly ProcedureItem<S, CT, I>[];
} & (
  | { readonly type: 'normal'; readonly failure?: never }
  | { readonly type: 'emergency'; readonly failure: F }
);

export type AircraftDefinition<
  S,
  CT extends ControlRecord,
  I extends string,
  F extends string,
  P extends string,
  V extends string = string,
> = {
  readonly id: string;
  readonly name: Text;
  readonly handbookRevision: Text;
  readonly controls: CT & ControlRules<CT>;
  readonly indicators: { readonly [K in I]: IndicatorDefinition<S> };
  readonly views: { readonly [K in V]: ViewDefinition<ControlId<CT>, NoInfer<I>> };
  readonly devices?: { readonly [installId: string]: DeviceInstall<S, NoInfer<V>> };
  readonly cockpit?: CockpitLayout<NoInfer<V>>;
  readonly systems: SystemsDefinition<S, NoInfer<F>>;
  /** Whether the engine runs; selects `imageRunning` over `image` in the outside view. */
  readonly engineRunning?: Condition<S>;
  readonly failures: { readonly [K in F]: FailureDefinition<BreakerId<NoInfer<CT>>> };
  readonly phases: { readonly [K in P]: PhaseDefinition<S, CT> };
  readonly procedures: {
    readonly [id: string]: ProcedureDefinition<S, CT, NoInfer<I>, NoInfer<F>, NoInfer<P>>;
  };
};

export type Aircraft = AircraftDefinition<
  unknown,
  ControlRecord,
  string,
  string,
  string,
  string
> & {
  readonly contractVersion: number;
};
