import type { DeviceScreenProps } from '@cpt/panel-kit';
import { AeraFace } from '../face/AeraFace';
import type { Aera500State } from '../logic';
import './Aera500Screen.css';

export function Aera500Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Aera500State;
  return <AeraFace mode="dock" state={unit} lit={on && unit.on} send={send} />;
}
