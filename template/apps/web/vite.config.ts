import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3000";

	return {
		plugins: [react(), tailwindcss(), TanStackRouterVite()],
		resolve: {
			alias: {
				// Keep shadcn's @ alias working for its own components
				"@": path.resolve(__dirname, "./src"),
				"#features": path.resolve(__dirname, "./src/features"),
				"#shared": path.resolve(__dirname, "./src/shared"),
				"#routes": path.resolve(__dirname, "./src/routes"),
			},
		},
		server: {
			port: 5173,
			proxy: {
				"/api": {
					target: apiProxyTarget,
					changeOrigin: true,
				},
				"/uploads": {
					target: apiProxyTarget,
					changeOrigin: true,
				},
			},
		},
		build: {
			outDir: "dist",
			sourcemap: mode !== "production",
			rollupOptions: {
				onwarn(warning, warn) {
					if (
						warning.code === "INVALID_ANNOTATION" &&
						warning.message.includes("#__PURE__") &&
						warning.id?.includes("@hugeicons/core-free-icons")
					) {
						return;
					}
					warn(warning);
				},
				output: {
					manualChunks(id) {
						const normalized = id.replaceAll("\\", "/");
						if (!normalized.includes("/node_modules/")) return undefined;
						const mod = normalized.split("/node_modules/").at(-1) ?? "";
						if (mod.startsWith("react/") || mod.startsWith("react-dom/") || mod.startsWith("scheduler/"))
							return "react";
						if (mod.startsWith("@tanstack/")) return "tanstack";
						if (mod.startsWith("recharts/") || mod.startsWith("d3-") || mod.startsWith("victory-vendor/"))
							return "charts";
						if (mod.startsWith("radix-ui/") || mod.startsWith("@radix-ui/")) return "ui";
						if (mod.startsWith("@hugeicons/") || mod.startsWith("lucide-react/")) return "icons";
						if (mod.startsWith("i18next/") || mod.startsWith("react-i18next/")) return "i18n";
						if (mod.startsWith("better-auth/") || mod.startsWith("@better-auth/")) return "auth";
						return "vendor";
					},
				},
			},
		},
	};
});
