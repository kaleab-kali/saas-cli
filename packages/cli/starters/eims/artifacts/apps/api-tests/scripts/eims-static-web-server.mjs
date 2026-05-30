import { readFile, stat } from "node:fs/promises";
import { createServer, request } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const distDir = path.resolve(process.env.WEB_DIST_DIR ?? path.join(root, "apps/web/dist"));
const port = Number(process.env.STATIC_WEB_PORT ?? 5179);
const apiPort = Number(process.env.MOCK_API_PORT ?? 3180);

const mime = new Map([
	[".html", "text/html; charset=utf-8"],
	[".js", "text/javascript; charset=utf-8"],
	[".css", "text/css; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".svg", "image/svg+xml"],
	[".png", "image/png"],
	[".jpg", "image/jpeg"],
	[".jpeg", "image/jpeg"],
	[".woff2", "font/woff2"],
]);

const send = (res, statusCode, body, contentType = "text/plain; charset=utf-8") => {
	res.writeHead(statusCode, { "content-type": contentType });
	res.end(body);
};

const proxyApi = (req, res, reqUrl) => {
	const proxyReq = request(
		{
			hostname: "127.0.0.1",
			port: apiPort,
			path: reqUrl.pathname + reqUrl.search,
			method: req.method,
			headers: req.headers,
		},
		(proxyRes) => {
			res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
			proxyRes.pipe(res);
		},
	);
	proxyReq.on("error", () => send(res, 502, JSON.stringify({ error: "proxy_failed" }), "application/json"));
	req.pipe(proxyReq);
};

const server = createServer(async (req, res) => {
	try {
		const reqUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
		if (reqUrl.pathname.startsWith("/api/")) {
			proxyApi(req, res, reqUrl);
			return;
		}

		const cleanPath = decodeURIComponent(reqUrl.pathname);
		const relativePath = cleanPath === "/" ? "index.html" : cleanPath.slice(1);
		let absolutePath = path.resolve(path.join(distDir, relativePath));
		if (!absolutePath.startsWith(distDir)) throw new Error("Invalid path");

		let fileStat = null;
		try {
			fileStat = await stat(absolutePath);
		} catch {
			fileStat = null;
		}
		if (!fileStat || fileStat.isDirectory()) {
			absolutePath = path.join(distDir, "index.html");
		}

		const data = await readFile(absolutePath);
		send(res, 200, data, mime.get(path.extname(absolutePath)) ?? "application/octet-stream");
	} catch (error) {
		send(res, 500, error instanceof Error ? error.message : String(error));
	}
});

server.on("upgrade", (_req, socket) => {
	socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
	socket.destroy();
});

server.listen(port, "127.0.0.1", () => {
	console.log(`EIMS static web listening on http://127.0.0.1:${port}`);
});
