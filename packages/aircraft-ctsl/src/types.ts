import type { PhaseId, ProcedureDefinition } from '@cpt/core';
import type { controls } from './controls';
import type { CtslFailure } from './failures';
import type { IndicatorId } from './indicators';
import type { CtslState } from './systems';

export type { CtslFailure, IndicatorId, PhaseId };

export type CtslProcedures = {
  readonly [id: string]: ProcedureDefinition<
    CtslState,
    typeof controls,
    IndicatorId,
    CtslFailure,
    PhaseId
  >;
};
