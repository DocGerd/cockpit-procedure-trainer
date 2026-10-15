// Long enough that the loop is not heard repeating under a steady drone.
const NOISE_SECONDS = 10;

/** The RMS of white noise spread evenly between -1 and 1. */
export const NOISE_RMS = 1 / Math.sqrt(3);

const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One white-noise buffer per context, filled once and shared by every voice on it. */
export function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = buffers.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(
    1,
    Math.round(context.sampleRate * NOISE_SECONDS),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  buffers.set(context, buffer);
  return buffer;
}

/** A looping source of the shared noise, not yet started. */
export function noiseSource(context: BaseAudioContext): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  source.loop = true;
  return source;
}
