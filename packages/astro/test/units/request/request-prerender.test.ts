import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequest } from '../../../dist/core/request.js';
import { defaultLogger } from '../test-utils.ts';

describe('createRequest with isPrerendered', () => {
	it('strips search params for prerendered pages', () => {
		const request = createRequest({
			url: new URL('http://localhost:4321/about?foo=bar'),
			headers: {},
			logger: defaultLogger,
			isPrerendered: true,
			routePattern: '/about',
		});
		const url = new URL(request.url);
		assert.equal(url.search, '', 'search params should be stripped for prerendered pages');
	});

	it('preserves search params for non-prerendered routes', () => {
		const request = createRequest({
			url: new URL('http://localhost:4321/_image?href=test&w=100'),
			headers: {},
			logger: defaultLogger,
			isPrerendered: false,
			routePattern: '/_image',
		});
		const url = new URL(request.url);
		assert.equal(url.searchParams.get('href'), 'test');
		assert.equal(url.searchParams.get('w'), '100');
	});
});
