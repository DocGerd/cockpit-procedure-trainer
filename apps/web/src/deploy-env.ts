export type DeployEnv = 'prod' | 'uat';

export function deployEnv(value: unknown): DeployEnv {
  return value === 'uat' ? 'uat' : 'prod';
}
