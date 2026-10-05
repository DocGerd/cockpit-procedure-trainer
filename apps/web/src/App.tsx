import { CONTRACT_VERSION } from '@cpt/core';
import { aircraftRegistry } from './aircraft-registry';

export function App() {
  return (
    <main>
      <h1>Cockpit Procedure Trainer</h1>
      <p>Training aid only. The aircraft&apos;s handbook is authoritative.</p>
      <p>
        Contract v{CONTRACT_VERSION} · {aircraftRegistry.length} aircraft
      </p>
    </main>
  );
}
