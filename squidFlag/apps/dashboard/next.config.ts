import type { NextConfig } from 'next';
import { dashboardEnv } from './src/lib/env';

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_API_URL: dashboardEnv.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
