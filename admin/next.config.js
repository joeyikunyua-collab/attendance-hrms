const API_URL = process.env.API_URL || "http://localhost:4001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxies /api/* to the standalone Express API (see ../api). This keeps
  // the browser talking to a single origin - lib/axios.ts's baseURL "/api"
  // and the httpOnly auth cookie need no changes, and there's no CORS or
  // cross-site cookie configuration to deal with.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
