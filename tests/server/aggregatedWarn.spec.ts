import {expect} from 'chai';
import {runInSandbox} from '@/server/ai/simulationSandbox';
import {resetAggregatedWarnings, warnAggregated} from '@/server/utils/aggregatedWarn';

describe('warnAggregated', () => {
  it('logs the first warning and one summary for repeats', async () => {
    const messages: Array<string> = [];
    const originalWarn = console.warn;
    console.warn = (message: string) => messages.push(message);
    try {
      warnAggregated('test-key', 'repeated problem', 10);
      warnAggregated('test-key', 'repeated problem', 10);
      warnAggregated('test-key', 'repeated problem', 10);
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(messages).has.length(2);
      expect(messages[0]).eq('repeated problem');
      expect(messages[1]).contains('repeated problem [repeated 3 times in');
    } finally {
      console.warn = originalWarn;
      resetAggregatedWarnings();
    }
  });

  it('keeps different warnings separate', async () => {
    const messages: Array<string> = [];
    const originalWarn = console.warn;
    console.warn = (message: string) => messages.push(message);
    try {
      warnAggregated('first', 'first problem', 10);
      warnAggregated('second', 'second problem', 10);
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(messages).deep.eq(['first problem', 'second problem']);
    } finally {
      console.warn = originalWarn;
      resetAggregatedWarnings();
    }
  });

  it('does not log warnings created inside a simulation', async () => {
    const messages: Array<string> = [];
    const originalWarn = console.warn;
    console.warn = (message: string) => messages.push(message);
    try {
      runInSandbox(() => {
        warnAggregated('simulated', 'illegal state in a game copy', 10);
        warnAggregated('simulated', 'illegal state in a game copy', 10);
      });
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(messages).deep.eq([]);
    } finally {
      console.warn = originalWarn;
      resetAggregatedWarnings();
    }
  });

  it('logs warnings again after a simulation', async () => {
    const messages: Array<string> = [];
    const originalWarn = console.warn;
    console.warn = (message: string) => messages.push(message);
    try {
      runInSandbox(() => warnAggregated('simulated', 'ignored', 10));
      warnAggregated('real', 'real problem', 10);
      warnAggregated('real', 'real problem', 10);
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(messages[0]).eq('real problem');
      expect(messages[1]).contains('real problem [repeated 2 times in');
    } finally {
      console.warn = originalWarn;
      resetAggregatedWarnings();
    }
  });
});
