import {expect} from 'chai';
import fs from 'fs';
import {LobbySubPage} from '../../src/server/routes/LobbySubPage';
import {ServeAsset} from '../../src/server/routes/ServeAsset';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

describe('LobbySubPage', () => {
  it('renders the app page with a base for each lobby address', async () => {
    const original = ServeAsset.INSTANCE.renderAppPage;
    const bases: Array<string | undefined> = [];
    const expectedLength = fs.readFileSync('assets/index.html').length;
    ServeAsset.INSTANCE.renderAppPage = (raw: Buffer, base?: string) => {
      bases.push(base);
      return Buffer.from('rendered:' + raw.length);
    };
    try {
      for (const handler of [LobbySubPage.LOBBY, LobbySubPage.CREATE, LobbySubPage.ROOM]) {
        const res = new MockResponse();
        await new RouteTestScaffolding().get(handler, res);
        expect(res.content).eq('rendered:' + expectedLength);
        expect(res.getHeader('Content-Type')).eq('text/html; charset=utf-8');
        expect(res.getHeader('Cache-Control')).eq('no-cache');
      }
    } finally {
      ServeAsset.INSTANCE.renderAppPage = original;
    }
    expect(bases).deep.eq(['./', '../', '../../']);
  });
});
