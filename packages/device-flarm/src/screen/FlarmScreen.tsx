import type { DeviceScreenProps } from '@cpt/panel-kit';
import { FlarmFace } from '../face/FlarmFace';
import type { FlarmState } from '../logic';

export function FlarmScreen({ on, state, send }: DeviceScreenProps) {
  return <FlarmFace mode="dock" on={on} state={state as FlarmState} send={send} />;
}
