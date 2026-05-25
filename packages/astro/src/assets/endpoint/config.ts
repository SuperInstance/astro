import { resolveInjectedRoute } from '../../core/routing/create-manifest.js';
import { parseRoute } from '../../core/routing/parse-route.js';
import type { AstroSettings, RoutesList } from '../../types/astro.js';
import type { RouteData } from '../../types/public/internal.js';

export function injectImageEndpoint(
	settings: AstroSettings,
	manifest: RoutesList,
	mode: 'dev' | 'build',
	cwd?: string,
) {
	manifest.routes.unshift(getImageEndpointData(settings, mode, cwd));
}

function getImageEndpointData(
	settings: AstroSettings,
	mode: 'dev' | 'build',
	cwd?: string,
): RouteData {
	const endpointEntrypoint =
		settings.config.image.endpoint.entrypoint === undefined // If not set, use default endpoint
			? mode === 'dev'
				? 'astro/assets/endpoint/dev'
				: 'astro/assets/endpoint/generic'
			: settings.config.image.endpoint.entrypoint;

	const component = resolveInjectedRoute(endpointEntrypoint, settings.config.root, cwd).component;

	return parseRoute(settings.config.image.endpoint.route, settings, {
		component,
		type: 'endpoint',
		origin: 'internal',
		isIndex: false,
		// In dev mode, mark as prerendered so the prerender handler picks it up.
		// This ensures the image endpoint works even when an adapter replaces the
		// SSR environment with a non-runnable one (e.g. Cloudflare's workerd).
		prerender: mode === 'dev',
		params: [],
	});
}
