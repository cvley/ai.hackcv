/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 内容采集后分钟级上线：页面采用 ISR，默认 300s 重新生成
  // production 环境可结合 on-demand revalidation 触发即时刷新
  experimental: {
    // ip2region 运行时用 fs 读自带 .db，必须保持为 node_modules 外部依赖，
    // 否则 webpack 打进 bundle 后 __dirname 错位导致找不到数据文件。
    serverComponentsExternalPackages: ["ip2region"],
  },
};

export default nextConfig;
