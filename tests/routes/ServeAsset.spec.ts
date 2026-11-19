import path from 'path';
import {expect} from 'chai';
import fs from 'fs';
import {FileAPI, ServeAsset} from '../../src/server/routes/ServeAsset';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';

class FileApiMock extends FileAPI {
  public constructor() {
    super();
  }
  public override readFile(path: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from('data: ' + path));
  }
  public override existsSync(_path: string): boolean {
    return true;
  }
}

describe('ServeAsset', () => {
  let instance: ServeAsset;
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let fileApi: FileApiMock;

  const storedNodeEnv = process.env.NODE_ENV;
  beforeEach(() => {
    instance = new ServeAsset(undefined, false);
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    fileApi = new FileApiMock();
  });
  afterEach(() => {
    process.env.NODE_ENV = storedNodeEnv;
  });

  it('bad filename', async () => {
    scaffolding.url = 'goo.goo.gaa.gaa';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('index.html', async () => {
    scaffolding.url = '/build/index.html';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content.startsWith('<!DOCTYPE html>'));
  });

  it('sw.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/sw.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/sw.js');
  });

  it('chunk js file', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: ' + path.resolve('build/chunks/player-home.js'));
  });

  it('does not serve source maps', async () => {
    // They would publish the full source with comments, including private extensions
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js.map';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('serves the self-hosted fonts', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/assets/fonts/ubuntu/ubuntu-latin-400-normal.woff2';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.ok);
    expect(res.getHeader('Content-Type')).eq('font/woff2');
  });

  it('serves the favicon chosen in FAVICON_ICON and FAVICON_COLOR', async () => {
    const stored = {icon: process.env.FAVICON_ICON, color: process.env.FAVICON_COLOR};
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    };
    try {
      instance = new ServeAsset(undefined, false, fileApi);
      scaffolding.url = '/favicon.ico';
      scaffolding.req.headers['accept-encoding'] = '';
      process.env.FAVICON_ICON = 'city';
      process.env.FAVICON_COLOR = 'blue';
      await scaffolding.get(instance, res);
      expect(res.content).eq('data: assets/favicon/city-blue.png');
      expect(res.getHeader('Content-Type')).eq('image/png');

      res = new MockResponse();
      delete process.env.FAVICON_ICON;
      delete process.env.FAVICON_COLOR;
      await scaffolding.get(instance, res);
      expect(res.content).eq('data: assets/favicon.ico');
    } finally {
      restore('FAVICON_ICON', stored.icon);
      restore('FAVICON_COLOR', stored.color);
    }
  });

  it('rejects a folder next to assets whose name starts the same', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/assets-other/secret.json';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('rejects path traversal in chunks', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/../main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('serves all local assets referenced in index.html', async () => {
    const html = fs.readFileSync('build/index.html', 'utf8');
    const references = [
      ...[...html.matchAll(/<script[^>]* src="([^"]+)"/g)].map((m) => ({url: m[1], contentType: 'text/javascript'})),
      // Google Fonts is an external stylesheet; only same-origin assets are served by ServeAsset.
      ...[...html.matchAll(/<link[^>]* rel="stylesheet"[^>]* href="([^"]+)"/g)]
        .map((m) => ({url: m[1], contentType: 'text/css'}))
        .filter((ref) => ref.url.startsWith('/')),
    ];
    expect(references).to.not.be.empty;
    for (const ref of references) {
      const perRes = new MockResponse();
      const perScaffolding = new RouteTestScaffolding();
      instance = new ServeAsset(undefined, false, fileApi);
      perScaffolding.url = ref.url;
      perScaffolding.req.headers['accept-encoding'] = '';
      await perScaffolding.get(instance, perRes);
      expect(perRes.statusCode, `${ref.url} should return 200`).eq(statusCode.ok);
      expect(perRes.getHeader('Content-Type'), `${ref.url} content type`).eq(ref.contentType);
    }
  });
});
