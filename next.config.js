/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 번들 크기 분석 (개발 시 활성화)
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.optimization.splitChunks.cacheGroups = {
  //       ...config.optimization.splitChunks.cacheGroups,
  //       supabase: {
  //         test: /[\\/]node_modules[\\/]@supabase[\\/]/,
  //         name: 'supabase',
  //         priority: 10,
  //       },
  //     };
  //   }
  //   return config;
  // },
};

module.exports = nextConfig;