import { CONTRACT_VERSION } from '@cpt/core';
import { aircraftRegistry } from './aircraft-registry';
import { deployEnv } from './deploy-env';

export function App() {
  const isUat = deployEnv(import.meta.env.VITE_DEPLOY_ENV) === 'uat';
  return (
    <main>
      <header>
        <h1>Cockpit Procedure Trainer</h1>
        {isUat && <span className="uat-badge">UAT</span>}
      </header>
      <p>Training aid only. The aircraft&apos;s handbook is authoritative.</p>
      <p>
        Contract v{CONTRACT_VERSION} · {aircraftRegistry.length} aircraft
      </p>
    </main>
  );
}
