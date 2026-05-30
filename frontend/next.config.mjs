const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_OUTPUT_EXPORT === "true" ? "export" : undefined,
  basePath: basePath || undefined,
  trailingSlash: process.env.NEXT_OUTPUT_EXPORT === "true",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
