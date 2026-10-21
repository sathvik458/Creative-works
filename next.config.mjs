/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  // Story JSON is read from /content at build time; make sure it ships with server output too.
  outputFileTracingIncludes: { "/**": ["./content/**/*"] },
};
export default nextConfig;
