import { AUTH_PORT } from './auth.port';
import { BILLING_PORT } from './billing.port';
import { ORG_PORT } from './org.port';
import { PROJECT_PORT } from './project.port';
import { portErr, portOk, portError } from './models/common.model';

describe('@oequ/ports', () => {
  it('exposes injection tokens', () => {
    expect(AUTH_PORT.toString()).toContain('AUTH_PORT');
    expect(ORG_PORT.toString()).toContain('ORG_PORT');
    expect(BILLING_PORT.toString()).toContain('BILLING_PORT');
    expect(PROJECT_PORT.toString()).toContain('PROJECT_PORT');
  });

  it('models PortResult helpers', () => {
    expect(portOk('x')).toEqual({ ok: true, data: 'x' });
    const err = portError('NOT_FOUND', 'missing');
    expect(portErr<string>(err)).toEqual({ ok: false, error: err });
  });
});
