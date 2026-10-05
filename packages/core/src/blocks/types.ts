export type SystemBlock<State, Inputs> = {
  readonly initial: State;
  step(state: State, inputs: Inputs, dtMs: number): State;
};
