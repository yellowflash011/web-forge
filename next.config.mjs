const nextConfig = { output: 'export', distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', images: { unoptimized: true }, trailingSlash: true, devIndicators: false };
export default nextConfig;
