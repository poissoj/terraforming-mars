import {expect} from 'chai';
import {publicOrigin} from '../../src/server/server/publicOrigin';
import {MockRequest} from '../routes/HttpMocks';

describe('publicOrigin', () => {
  it('prefers the configured public address and drops trailing slashes', () => {
    const req = new MockRequest();
    req.headers.host = 'internal:8080';
    expect(publicOrigin(req, {URL_ROOT: ' https://tm.example/app/ '})).eq('https://tm.example/app');
  });

  it('rebuilds the origin from the request', () => {
    const req = new MockRequest();
    req.headers.host = 'tm.example:8080';
    expect(publicOrigin(req, {})).eq('http://tm.example:8080');
  });

  it('uses the proxy protocol and host', () => {
    const req = new MockRequest();
    req.headers.host = 'internal:8080';
    req.headers['x-forwarded-host'] = 'tm.example';
    req.headers['x-forwarded-proto'] = 'https';
    expect(publicOrigin(req, {})).eq('https://tm.example');
  });

  it('recognises a direct TLS connection', () => {
    const req = new MockRequest();
    req.headers.host = 'tm.example';
    Object.assign(req.socket, {encrypted: true});
    expect(publicOrigin(req, {})).eq('https://tm.example');
  });

  it('has no origin without a host', () => {
    expect(publicOrigin(new MockRequest(), {})).is.undefined;
  });
});
