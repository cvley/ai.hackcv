// 会话相关常量（edge 安全，middleware 与 route 共用，不依赖 node crypto）
export const ADMIN_COOKIE = "hackcv_admin";
export const ADMIN_TTL = 60 * 60 * 8; // 8 小时（秒）
