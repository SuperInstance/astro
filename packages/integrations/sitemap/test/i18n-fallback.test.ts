import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { type Fixture, loadFixture, readXML } from './test-utils.ts';

describe('i18n fallback', () => {
	let fixture: Fixture;
	let urls: string[];

	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/i18n-fallback/',
		});
		await fixture.build();
		const data = await readXML(fixture.readFile('/sitemap-0.xml'));
		urls = data.urlset.url.map((url: { loc: string[] }) => url.loc[0]);
	});

	it('includes default locale pages', async () => {
		assert.equal(urls.includes('http://example.com/'), true);
		assert.equal(urls.includes('http://example.com/about/'), true);
	});

	it('includes fallback locale pages', async () => {
		assert.equal(urls.includes('http://example.com/fr/'), true);
		assert.equal(urls.includes('http://example.com/fr/about/'), true);
	});

	it('includes dynamic route pages', async () => {
		assert.equal(urls.includes('http://example.com/blog/post-one/'), true);
		assert.equal(urls.includes('http://example.com/blog/post-two/'), true);
	});

	it('includes fallback locale pages for dynamic routes', async () => {
		assert.equal(urls.includes('http://example.com/fr/blog/post-one/'), true);
		assert.equal(urls.includes('http://example.com/fr/blog/post-two/'), true);
	});
});
