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
  readonly artwork: { readonly face: string; readonly moving: MovingPart };
};

export type Appearance = WidgetAppearance | ArtworkAppearance;

export type ControlPosition = string | number;
export type Positions = { readonly [id: string]: ControlPosition };

export type BreakerPosition = 'in' | 'pulled';
export type GuardPosition = 'closed' | 'open';

type ControlBase = {
  readonly name: Text;
  readonly description: Text;
  readonly appearance?: Appearance;
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

export type TrainerState<S> = {
  readonly controls: Positions;
  readonly systems: S;
  readonly devices: Readonly<Record<string, unknown>>;
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
  readonly position3d?: Vec3;
  readonly orientation?: Vec3;
};

export type ViewDefinition<C extends string, I extends string> = {
  readonly name: Text;
  readonly image: string;
  readonly controls?: { readonly [K in C]?: Placement };
  readonly indicators?: { readonly [K in I]?: Placement };
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

export type FailureDefinition<B extends string = string> = {
  readonly name: Text;
  readonly trips?: readonly B[];
};

export type ControlRecord = { readonly [id: string]: ControlDefinition };

export type ControlId<CT extends ControlRecord> = keyof NoInfer<CT> & string;

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

type PositionRules<D> = D extends { readonly positions: readonly (infer P extends string)[] }
  ? { readonly initial: P } & (D extends { readonly springBack: infer SB }
      ? { readonly springBack: { readonly [K in keyof SB]: K extends P ? P : never } }
      : unknown) &
      (D extends {
        readonly appearance: {
          readonly artwork: { readonly moving: { readonly type: 'positions' } };
        };
      }
        ? {
            readonly appearance: {
              readonly artwork: {
                readonly moving: { readonly images: { readonly [K in P]: string } };
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
  readonly image: string;
  readonly environment: Environment;
  readonly entry: {
    readonly controls: { readonly [K in ControlId<CT>]: PositionOf<NoInfer<CT>[K]> };
    readonly state: S;
  };
};

type ItemBase = { readonly text: Text };

export type ActionItem<S, CT extends ControlRecord = ControlRecord> = ItemBase &
  {
    [K in ControlId<CT>]: {
      readonly type: 'action';
      readonly control: K;
      readonly position: PositionOf<NoInfer<CT>[K]>;
      readonly holdUntil?: Condition<S>;
    };
  }[ControlId<CT>];

export type CheckItem<
  S,
  CT extends ControlRecord = ControlRecord,
  I extends string = string,
> = ItemBase & {
  readonly type: 'check';
  readonly target: { readonly indicator: I } | { readonly control: ControlId<CT> };
  readonly condition: Condition<S>;
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
> = {
  readonly id: string;
  readonly name: Text;
  readonly handbookRevision: string;
  readonly controls: CT & ControlRules<CT>;
  readonly indicators: { readonly [K in I]: IndicatorDefinition<S> };
  readonly views: { readonly [id: string]: ViewDefinition<ControlId<CT>, NoInfer<I>> };
  readonly systems: SystemsDefinition<S, NoInfer<F>>;
  readonly failures: { readonly [K in F]: FailureDefinition<BreakerId<NoInfer<CT>>> };
  readonly phases: { readonly [K in P]: PhaseDefinition<S, CT> };
  readonly procedures: {
    readonly [id: string]: ProcedureDefinition<S, CT, NoInfer<I>, NoInfer<F>, NoInfer<P>>;
  };
};

export type Aircraft = AircraftDefinition<unknown, ControlRecord, string, string, string> & {
  readonly contractVersion: number;
};
