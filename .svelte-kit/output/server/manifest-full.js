export const manifest = {
	appDir: "_app",
	appPath: "qr.dewantaratirta.github.io/_app",
	assets: new Set([".nojekyll","android-icon-144x144.png","android-icon-192x192.png","android-icon-36x36.png","android-icon-48x48.png","android-icon-72x72.png","android-icon-96x96.png","apple-icon-114x114.png","apple-icon-120x120.png","apple-icon-144x144.png","apple-icon-152x152.png","apple-icon-180x180.png","apple-icon-57x57.png","apple-icon-60x60.png","apple-icon-72x72.png","apple-icon-76x76.png","apple-icon-precomposed.png","apple-icon.png","assets/css/pico-bootstrap-grid.min.css","assets/css/pico.min.css","browserconfig.xml","favicon-16x16.png","favicon-32x32.png","favicon-96x96.png","favicon.ico","img/pp.webp","manifest.json","ms-icon-144x144.png","ms-icon-150x150.png","ms-icon-310x310.png","ms-icon-70x70.png","portfolio/placeholder.webp","portfolio/sapa-budaya.jpg","robots.txt","sirclo.png"]),
	mimeTypes: {".png":"image/png",".css":"text/css",".xml":"application/xml",".ico":"image/vnd.microsoft.icon",".webp":"image/webp",".json":"application/json",".jpg":"image/jpeg",".txt":"text/plain"},
	_: {
		entry: {"file":"_app/immutable/start-50cfbcd9.js","imports":["_app/immutable/start-50cfbcd9.js","_app/immutable/chunks/index-75540454.js","_app/immutable/chunks/singletons-2f568c40.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			() => import('./nodes/0.js'),
			() => import('./nodes/1.js'),
			() => import('./nodes/2.js')
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0], errors: [1], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api",
				pattern: /^\/api\/?$/,
				params: [],
				page: null,
				endpoint: () => import('./entries/endpoints/api/_server.js')
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
};
