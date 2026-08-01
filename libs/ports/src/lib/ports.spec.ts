import { portErr, portOk, portError } from './models/common.model';

describe('@oequ/ports', () => {
  it('models PortResult helpers', () => {
    expect(portOk('x')).toEqual({ ok: true, data: 'x' });
    const err = portError('NOT_FOUND', 'missing');
    expect(portErr<string>(err)).toEqual({ ok: false, error: err });
  });
});
