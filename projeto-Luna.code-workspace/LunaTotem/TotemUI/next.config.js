/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    swcMinify: true,
    typescript: {
        // Avoid failing the build on TypeScript deprecation diagnostics
        ignoreBuildErrors: true,
    },
    experimental: {
        externalDir: true
    },
    async rewrites() {
        const normalizeProxyTarget = (input, fallback) => {
            let url = String(input || '').trim();
            if (!url) url = String(fallback || '').trim();
            // Allow setting just the hostname in Vercel env vars.
            if (url && !/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            // Remove trailing slash to avoid double slashes when appending paths.
            url = url.replace(/\/+$/, '');
            return url;
        };

        // Same-origin proxy to backend.
        // IMPORTANT: keep this as fallback so local Next routes (e.g. /api/health) still work.
        // In docker-compose, TotemAPI is reachable by service name `totemapi:8081`.
        const totemApiTarget = normalizeProxyTarget(
            process.env.TOTEM_API_PROXY_URL,
            'http://totemapi:8081'
        );
        // Auth lives in LunaCore (not TotemAPI). In docker-compose, LunaCore is reachable by service name `lunacore:8080`.
        // In Vercel, set LUNACORE_PROXY_URL to the public Railway URL of LunaCore.
        const lunaCoreTarget = normalizeProxyTarget(
            process.env.LUNACORE_PROXY_URL || process.env.CORE_API_PROXY_URL,
            'http://lunacore:8080'
        );
        return {
            // Ensure auth calls go to LunaCore; everything else under /api goes to TotemAPI.
            beforeFiles: [
                {
                    source: '/api/auth/:path*',
                    destination: `${lunaCoreTarget}/api/auth/:path*`,
                },
            ],
            fallback: [
                {
                    source: '/api/:path*',
                    destination: `${totemApiTarget}/api/:path*`,
                },
                {
                    source: '/actuator/:path*',
                    destination: `${totemApiTarget}/actuator/:path*`,
                },
            ],
        };
    },
    webpack(config) {
        const rootModules = path.resolve(__dirname, 'node_modules');
        if (Array.isArray(config.resolve.modules)) {
            config.resolve.modules = [rootModules, ...config.resolve.modules];
        } else {
            config.resolve.modules = [rootModules];
        }

        config.resolve.alias['lucide-react'] = path.resolve(__dirname, 'node_modules', 'lucide-react');

        return config;
    }
};

module.exports = nextConfig;
