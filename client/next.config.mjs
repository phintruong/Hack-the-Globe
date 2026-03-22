/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Ignore the problematic exports field in @mediapipe/tasks-vision
    config.resolve.exportsFields = [];
return config;
  },
};

export default nextConfig;
