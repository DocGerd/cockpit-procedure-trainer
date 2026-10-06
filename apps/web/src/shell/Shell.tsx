import { useTrainer } from '../trainer';
import { Picker } from './Picker';
import { TrainerLayout } from './TrainerLayout';
import './shell.css';

export function Shell() {
  return useTrainer().screen === 'picker' ? <Picker /> : <TrainerLayout />;
}
