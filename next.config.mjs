/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 内容采集后分钟级上线：页面采用 ISR，默认 300s 重新生成
  // production 环境可结合 on-demand revalidation 触发即时刷新
};

export default nextConfig;
