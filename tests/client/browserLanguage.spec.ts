import {expect} from 'chai';
import {browserLanguage} from '../../src/client/utils/browserLanguage';

describe('browserLanguage', () => {
  it('takes the first supported browser language', () => {
    expect(browserLanguage(['fr-FR', 'en-US'])).eq('fr');
    expect(browserLanguage(['xx-XX', 'de-DE', 'en-US'])).eq('de');
  });

  it('reduces regional variants to the app language', () => {
    expect(browserLanguage(['en-GB'])).eq('en');
    expect(browserLanguage(['es-419'])).eq('es');
    expect(browserLanguage(['nb-NO'])).eq('nb');
  });

  it('maps languages whose app code differs from the browser code', () => {
    expect(browserLanguage(['pt-BR'])).eq('br');
    expect(browserLanguage(['pt-PT'])).eq('br');
    expect(browserLanguage(['zh-CN'])).eq('cn');
    expect(browserLanguage(['no-NO'])).eq('nb');
    expect(browserLanguage(['nn-NO'])).eq('nb');
    expect(browserLanguage(['uk-UA'])).eq('ua');
    expect(browserLanguage(['ja-JP'])).eq('jp');
  });

  it('falls back to English', () => {
    expect(browserLanguage([])).eq('en');
    expect(browserLanguage(['xx-XX', 'yy-YY'])).eq('en');
  });
});
