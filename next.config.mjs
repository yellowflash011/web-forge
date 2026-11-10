const nextConfig = { distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'), images: { unoptimized: true }, trailingSlash: true, devIndicators: false };
export default nextConfig;
