import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleUrl } from './urls.mjs';

test('articleUrl upgrades http to https (issue #31)', () => {
  assert.equal(articleUrl('http://www.nytimes.com/2026/11/10/opinion/ai-consciousness.html'), 'https://www.nytimes.com/2026/11/10/opinion/ai-consciousness.html');
});

test('articleUrl drops query, fragment and AMP suffix', () => {
  assert.equal(articleUrl('https://www.vox.com/a/b/amp?x=1#y'), 'https://www.vox.com/a/b');
});
