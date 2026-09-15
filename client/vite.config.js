import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiTarget = (_b = env.VITE_API_URL) !== null && _b !== void 0 ? _b : 'http://localhost:3001';
    return {
        plugins: [react()],
        server: {
            port: 5173,
            host: '0.0.0.0',
            allowedHosts: true,
            proxy: {
                '/api': { target: apiTarget, changeOrigin: true },
                '/photos': { target: apiTarget, changeOrigin: true },
            },
        },
        preview: {
            host: '0.0.0.0',
            port: 4173,
        },
    };
});
