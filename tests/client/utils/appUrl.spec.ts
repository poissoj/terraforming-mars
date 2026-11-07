import {expect} from 'chai';
import {appUrl} from '@/client/utils/appUrl';

describe('appUrl', () => {
  const originalUrl = window.location.href;

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
  });

  it('resolves app paths from a nested lobby page', () => {
    window.history.replaceState({}, '', '/lobby/create');

    expect(appUrl('api/lobby')).eq(window.location.origin + '/api/lobby');
    expect(appUrl('player?id=p1')).eq(window.location.origin + '/player?id=p1');
  });

  it('keeps absolute URLs unchanged', () => {
    expect(appUrl('https://example.com/player?id=p1')).eq('https://example.com/player?id=p1');
  });
});
