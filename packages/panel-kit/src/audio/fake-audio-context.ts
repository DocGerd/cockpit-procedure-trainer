import type { AudioOut } from './audio-engine';

// A hand-written AudioContext for unit tests: it records what the code under test builds and
// schedules, and settles its state asynchronously as a browser does.

const finite = (...values: readonly number[]) => {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError('The value is not a finite number.');
  }
};

const times = (...values: readonly number[]) => {
  finite(...values);
  if (values.some((value) => value < 0)) throw new RangeError('A time is negative.');
};

const invalidState = (message: string) => new DOMException(message, 'InvalidStateError');

/** `value` is an assignment, which a browser treats as `setValueAtTime(value, currentTime)`. */
export type FakeAutomationMethod =
  | 'value'
  | 'setValueAtTime'
  | 'linearRampToValueAtTime'
  | 'exponentialRampToValueAtTime'
  | 'setTargetAtTime'
  | 'setValueCurveAtTime'
  | 'cancelScheduledValues';

export type FakeAutomation = {
  readonly method: FakeAutomationMethod;
  readonly args: readonly (number | readonly number[])[];
};

export class FakeAudioParam {
  readonly calls: FakeAutomation[] = [];
  #value: number;

  constructor(
    readonly owner: FakeAudioNode,
    readonly name: string,
    defaultValue: number,
  ) {
    this.#value = defaultValue;
  }

  /**
   * The last value set or scheduled, not a browser's value at `currentTime`; a cancel leaves it
   * unchanged, where a browser goes back to the last event still scheduled.
   */
  get value(): number {
    return this.#value;
  }

  set value(value: number) {
    finite(value);
    this.#record('value', [value], value);
  }

  setValueAtTime(value: number, startTime: number): this {
    finite(value);
    times(startTime);
    return this.#record('setValueAtTime', [value, startTime], value);
  }

  linearRampToValueAtTime(value: number, endTime: number): this {
    finite(value);
    times(endTime);
    return this.#record('linearRampToValueAtTime', [value, endTime], value);
  }

  exponentialRampToValueAtTime(value: number, endTime: number): this {
    finite(value);
    times(endTime);
    if (value === 0) throw new RangeError('An exponential ramp cannot reach 0.');
    return this.#record('exponentialRampToValueAtTime', [value, endTime], value);
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number): this {
    finite(target);
    times(startTime, timeConstant);
    return this.#record('setTargetAtTime', [target, startTime, timeConstant], target);
  }

  setValueCurveAtTime(values: Iterable<number>, startTime: number, duration: number): this {
    const curve = Array.from(values);
    finite(...curve);
    times(startTime, duration);
    if (curve.length < 2 || duration === 0) {
      throw new RangeError('A curve needs two values and a duration.');
    }
    return this.#record('setValueCurveAtTime', [curve, startTime, duration], curve.at(-1));
  }

  // No cancelAndHoldAtTime: Firefox lacks it, so a voice calling it fails here too.
  cancelScheduledValues(cancelTime: number): this {
    times(cancelTime);
    return this.#record('cancelScheduledValues', [cancelTime]);
  }

  #record(method: FakeAutomationMethod, args: FakeAutomation['args'], value?: number): this {
    this.calls.push({ method, args });
    if (value !== undefined) this.#value = value;
    return this;
  }
}

export type FakeConnection = {
  readonly target: FakeAudioNode | FakeAudioParam;
  readonly output: number;
  readonly input: number;
};

export class FakeAudioNode extends EventTarget {
  readonly connections: FakeConnection[] = [];
  /** Every `disconnect` call, with the output index or the target it named, if any. */
  readonly disconnects: (number | FakeAudioNode | FakeAudioParam | undefined)[] = [];

  constructor(
    readonly context: FakeAudioContext,
    readonly kind: FakeNodeKind,
  ) {
    super();
    context.nodes.push(this);
  }

  connect<T extends FakeAudioNode>(target: T, output?: number, input?: number): T;
  connect(target: FakeAudioParam, output?: number): undefined;
  connect(
    target: FakeAudioNode | FakeAudioParam,
    output = 0,
    input = 0,
  ): FakeAudioNode | undefined {
    const node = target instanceof FakeAudioParam ? target.owner : target;
    if (node.context !== this.context) {
      throw new DOMException('The target belongs to another context.', 'InvalidAccessError');
    }
    this.connections.push({ target, output, input });
    return target instanceof FakeAudioParam ? undefined : target;
  }

  disconnect(
    targetOrOutput?: number | FakeAudioNode | FakeAudioParam,
    output?: number,
    input?: number,
  ): void {
    const byOutput = typeof targetOrOutput === 'number';
    const named = (connection: FakeConnection) =>
      byOutput
        ? connection.output === targetOrOutput
        : (targetOrOutput === undefined || connection.target === targetOrOutput) &&
          (output === undefined || connection.output === output) &&
          (input === undefined || connection.input === input);
    const kept = this.connections.filter((connection) => !named(connection));
    if (!byOutput && targetOrOutput !== undefined && kept.length === this.connections.length) {
      throw new DOMException('The node is not connected to the target.', 'InvalidAccessError');
    }
    this.connections.splice(0, this.connections.length, ...kept);
    this.disconnects.push(targetOrOutput);
  }
}

export class FakeScheduledSourceNode extends FakeAudioNode {
  startedAt: number | undefined;
  stoppedAt: number | undefined;
  ended = false;
  onended: ((this: FakeScheduledSourceNode, event: Event) => void) | null = null;

  start(when = 0): void {
    times(when);
    if (this.startedAt !== undefined) throw invalidState('A source starts only once.');
    this.startedAt = when;
  }

  stop(when = 0): void {
    times(when);
    if (this.startedAt === undefined) throw invalidState('A source stops only after it starts.');
    this.stoppedAt = when;
    void Promise.resolve().then(() => this.settle(this.context.currentTime));
  }

  /** When the source stops playing, or undefined while it plays on. */
  endTime(): number | undefined {
    return this.stoppedAt;
  }

  /** Fires `ended` once `now` reaches the end time; the context calls it as time passes. */
  settle(now: number): void {
    const end = this.endTime();
    if (this.ended || end === undefined || end > now) return;
    this.ended = true;
    const event = new Event('ended');
    this.dispatchEvent(event);
    this.onended?.call(this, event);
  }
}

export class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam(this, 'gain', 1);

  constructor(context: FakeAudioContext) {
    super(context, 'gain');
  }
}

export class FakePeriodicWave {
  readonly real: readonly number[];
  readonly imag: readonly number[];

  constructor(
    real: Iterable<number>,
    imag: Iterable<number>,
    readonly disableNormalization: boolean,
  ) {
    this.real = Array.from(real);
    this.imag = Array.from(imag);
    if (this.real.length !== this.imag.length || this.real.length < 2) {
      throw new DOMException('A wave needs two or more matching terms.', 'IndexSizeError');
    }
  }
}

export class FakeOscillatorNode extends FakeScheduledSourceNode {
  readonly frequency = new FakeAudioParam(this, 'frequency', 440);
  readonly detune = new FakeAudioParam(this, 'detune', 0);
  periodicWave: FakePeriodicWave | undefined;
  #type: OscillatorType = 'sine';

  constructor(context: FakeAudioContext) {
    super(context, 'oscillator');
  }

  get type(): OscillatorType {
    return this.#type;
  }

  set type(type: OscillatorType) {
    if (type === 'custom') throw invalidState('A custom wave is set with setPeriodicWave.');
    this.#type = type;
  }

  setPeriodicWave(wave: FakePeriodicWave): void {
    this.periodicWave = wave;
    this.#type = 'custom';
  }
}

export class FakeConstantSourceNode extends FakeScheduledSourceNode {
  readonly offset = new FakeAudioParam(this, 'offset', 1);

  constructor(context: FakeAudioContext) {
    super(context, 'constant-source');
  }
}

export class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeAudioParam(this, 'frequency', 350);
  readonly detune = new FakeAudioParam(this, 'detune', 0);
  readonly Q = new FakeAudioParam(this, 'Q', 1);
  readonly gain = new FakeAudioParam(this, 'gain', 0);

  constructor(context: FakeAudioContext) {
    super(context, 'biquad-filter');
  }
}

export class FakeAudioBuffer {
  readonly #channels: Float32Array[];

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    if (numberOfChannels < 1 || length < 1 || sampleRate <= 0) {
      throw new DOMException('The buffer size is not supported.', 'NotSupportedError');
    }
    this.#channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  get duration(): number {
    return this.length / this.sampleRate;
  }

  getChannelData(channel: number): Float32Array {
    const data = this.#channels[channel];
    if (!data) throw new DOMException('The buffer has no such channel.', 'IndexSizeError');
    return data;
  }

  copyToChannel(source: Float32Array, channel: number, offset = 0): void {
    this.getChannelData(channel).set(source.subarray(0, this.length - offset), offset);
  }
}

export class FakeAudioBufferSourceNode extends FakeScheduledSourceNode {
  readonly playbackRate = new FakeAudioParam(this, 'playbackRate', 1);
  readonly detune = new FakeAudioParam(this, 'detune', 0);
  buffer: FakeAudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  offset = 0;
  duration: number | undefined;

  constructor(context: FakeAudioContext) {
    super(context, 'buffer-source');
  }

  override start(when = 0, offset = 0, duration?: number): void {
    times(offset, ...(duration === undefined ? [] : [duration]));
    super.start(when);
    this.offset = offset;
    this.duration = duration;
  }

  override endTime(): number | undefined {
    if (this.startedAt === undefined || this.loop || !this.buffer) return this.stoppedAt;
    const natural = this.startedAt + (this.duration ?? this.buffer.duration - this.offset);
    return Math.min(natural, this.stoppedAt ?? natural);
  }
}

type FakeNodeKinds = {
  destination: FakeAudioNode;
  gain: FakeGainNode;
  oscillator: FakeOscillatorNode;
  'constant-source': FakeConstantSourceNode;
  'biquad-filter': FakeBiquadFilterNode;
  'buffer-source': FakeAudioBufferSourceNode;
  'media-element-source': FakeAudioNode;
};

export type FakeNodeKind = keyof FakeNodeKinds;

export type FakeAudioContextOptions = {
  readonly sampleRate?: number;
  /** Whether the browser lets the context start; false holds every resume pending. */
  readonly allowStart?: boolean;
};

export class FakeAudioContext extends EventTarget {
  readonly nodes: FakeAudioNode[] = [];
  /** Every context method called, by name, in order. */
  readonly calls: string[] = [];
  readonly sampleRate: number;
  readonly destination: FakeAudioNode;
  readonly audioWorklet = {
    addModule: (): Promise<void> => {
      this.calls.push('audioWorklet.addModule');
      return Promise.resolve();
    },
  };
  allowStart: boolean;
  onstatechange: ((event: Event) => void) | null = null;
  #state: AudioContextState = 'suspended';
  #currentTime = 0;
  readonly #pendingResumes: { resolve(): void; reject(reason: unknown): void }[] = [];

  constructor({ sampleRate = 48000, allowStart = true }: FakeAudioContextOptions = {}) {
    super();
    this.sampleRate = sampleRate;
    this.allowStart = allowStart;
    this.destination = new FakeAudioNode(this, 'destination');
    if (allowStart) void Promise.resolve().then(() => this.#start());
  }

  get state(): AudioContextState {
    return this.#state;
  }

  get currentTime(): number {
    return this.#currentTime;
  }

  set currentTime(seconds: number) {
    times(seconds);
    this.#currentTime = seconds;
    for (const node of this.nodes) {
      if (node instanceof FakeScheduledSourceNode) node.settle(seconds);
    }
  }

  resume(): Promise<void> {
    this.calls.push('resume');
    if (this.#state === 'closed') return Promise.reject(invalidState('The context is closed.'));
    return new Promise((resolve, reject) => {
      this.#pendingResumes.push({ resolve, reject });
      if (this.allowStart) void Promise.resolve().then(() => this.#start());
    });
  }

  suspend(): Promise<void> {
    this.calls.push('suspend');
    if (this.#state === 'closed') return Promise.reject(invalidState('The context is closed.'));
    return Promise.resolve().then(() => this.#change('suspended'));
  }

  close(): Promise<void> {
    this.calls.push('close');
    if (this.#state === 'closed') return Promise.reject(invalidState('The context is closed.'));
    return Promise.resolve().then(() => this.#close());
  }

  /**
   * Changes the state as a browser can on its own (Safari's `interrupted`), firing `statechange`;
   * running settles pending resumes and closed rejects them, as a browser does.
   */
  setState(state: AudioContextState): void {
    if (state === 'running') this.#start();
    else if (state === 'closed') this.#close();
    else this.#change(state);
  }

  createGain(): FakeGainNode {
    this.calls.push('createGain');
    return new FakeGainNode(this);
  }

  createOscillator(): FakeOscillatorNode {
    this.calls.push('createOscillator');
    return new FakeOscillatorNode(this);
  }

  createConstantSource(): FakeConstantSourceNode {
    this.calls.push('createConstantSource');
    return new FakeConstantSourceNode(this);
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    this.calls.push('createBiquadFilter');
    return new FakeBiquadFilterNode(this);
  }

  createBufferSource(): FakeAudioBufferSourceNode {
    this.calls.push('createBufferSource');
    return new FakeAudioBufferSourceNode(this);
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): FakeAudioBuffer {
    this.calls.push('createBuffer');
    return new FakeAudioBuffer(numberOfChannels, length, sampleRate);
  }

  createPeriodicWave(
    real: Iterable<number>,
    imag: Iterable<number>,
    constraints?: PeriodicWaveConstraints,
  ): FakePeriodicWave {
    this.calls.push('createPeriodicWave');
    return new FakePeriodicWave(real, imag, constraints?.disableNormalization ?? false);
  }

  createMediaElementSource(): FakeAudioNode {
    this.calls.push('createMediaElementSource');
    return new FakeAudioNode(this, 'media-element-source');
  }

  /** This fake typed as the browser context the code under test expects. */
  asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }

  /** An `AudioOut` straight onto the destination, for a voice under test. */
  out(): AudioOut {
    return { context: this.asAudioContext(), input: this.destination as unknown as AudioNode };
  }

  nodesOf<K extends FakeNodeKind>(kind: K): FakeNodeKinds[K][] {
    return this.nodes.filter((node) => node.kind === kind) as FakeNodeKinds[K][];
  }

  /** Nodes still connected or playing; one-shot sounds that clean up after themselves drop out. */
  liveNodes(): FakeAudioNode[] {
    return this.nodes.filter(
      (node) =>
        node.connections.length > 0 ||
        (node instanceof FakeScheduledSourceNode && node.startedAt !== undefined && !node.ended),
    );
  }

  /** Whether connections lead from one node to another; a parameter leads to its own node. */
  reaches(from: FakeAudioNode, to: FakeAudioNode): boolean {
    const seen = new Set<FakeAudioNode>();
    const walk = (node: FakeAudioNode): boolean => {
      if (node === to) return true;
      if (seen.has(node)) return false;
      seen.add(node);
      return node.connections.some(({ target }) =>
        walk(target instanceof FakeAudioParam ? target.owner : target),
      );
    };
    return walk(from);
  }

  #start(): void {
    this.#change('running');
    for (const pending of this.#pendingResumes.splice(0)) pending.resolve();
  }

  #close(): void {
    this.#change('closed');
    for (const pending of this.#pendingResumes.splice(0)) {
      pending.reject(invalidState('The context is closed.'));
    }
  }

  #change(state: AudioContextState): void {
    if (this.#state === state || this.#state === 'closed') return;
    this.#state = state;
    const event = new Event('statechange');
    this.dispatchEvent(event);
    this.onstatechange?.(event);
  }
}
