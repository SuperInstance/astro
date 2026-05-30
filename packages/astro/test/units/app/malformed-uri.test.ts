import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createComponent, render } from '../../../dist/runtime/server/index.js';
import { createTestApp, createPage } from '../mocks.ts';

/**
 * Tests that App.match() handles malformed percent-encoded URLs gracefully
 * instead of throwing an uncaught URIError.
 *
 * Malformed sequences like %C0%AF (overlong UTF-8) are commonly sent by
 * automated path-traversal scanners. decodeURI() throws URIError for these
 * because the encoded bytes are not valid UTF-8. Without a guard, this
 * propagates as an uncaught exception → HTTP 500 in on-demand adapters.
 *
 * See: https://github.com/withastro/astro/issues/16916
 */

const homePage = createComponent((_result: any) => {
	return render`<h1>Home</h1>`;
});

const indexPage = createPage(homePage, {
	route: '/',
	component: 'src/pages/index.astro',
});

describe('App.match() with malformed percent-encoded URLs', () => {
	it('returns undefined for %C0%AF (overlong UTF-8)', () => {
		const app = createTestApp([indexPage]);
		const request = new Request('http://example.com/..%C0%AF.env');
		const result = app.match(request);
		assert.equal(result, undefined);
	});

	it('returns undefined for %FE (invalid UTF-8 start byte)', () => {
		const app = createTestApp([indexPage]);
		const request = new Request('http://example.com/%FE');
		const result = app.match(request);
		assert.equal(result, undefined);
	});

	it('returns undefined for %FF (invalid UTF-8 start byte)', () => {
		const app = createTestApp([indexPage]);
		const request = new Request('http://example.com/%FF');
		const result = app.match(request);
		assert.equal(result, undefined);
	});

	it('returns undefined for %C0 (truncated overlong sequence)', () => {
		const app = createTestApp([indexPage]);
		const request = new Request('http://example.com/%C0');
		const result = app.match(request);
		assert.equal(result, undefined);
	});

	it('still matches valid URLs', () => {
		const app = createTestApp([indexPage]);
		const request = new Request('http://example.com/');
		const result = app.match(request);
		assert.ok(result, 'should match the index route');
		assert.equal(result.route, '/');
	});
});
