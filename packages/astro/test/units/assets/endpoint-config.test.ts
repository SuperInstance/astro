import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { injectImageEndpoint } from '../../../dist/assets/endpoint/config.js';
import { createBasicSettings } from '../test-utils.ts';

describe('injectImageEndpoint', () => {
	it('marks the image endpoint as prerendered in dev mode', async () => {
		const settings = await createBasicSettings();
		const manifest = { routes: [] };
		injectImageEndpoint(settings, manifest, 'dev');
		const imageRoute = manifest.routes[0];
		assert.ok(imageRoute, 'image route should be injected');
		assert.equal(imageRoute.type, 'endpoint');
		assert.equal(imageRoute.prerender, true, '/_image should be prerendered in dev mode');
	});

	it('marks the image endpoint as non-prerendered in build mode', async () => {
		const settings = await createBasicSettings();
		const manifest = { routes: [] };
		injectImageEndpoint(settings, manifest, 'build');
		const imageRoute = manifest.routes[0];
		assert.ok(imageRoute, 'image route should be injected');
		assert.equal(imageRoute.type, 'endpoint');
		assert.equal(imageRoute.prerender, false, '/_image should not be prerendered in build mode');
	});
});
