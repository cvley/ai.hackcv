type LogoProps = { size?: number; className?: string };

// hackcv 品牌图标：蓝底「h」字母标 + 右上角 AI sparkle。
// 用于顶栏品牌位；favicon 另存 app/icon.svg（带渐变）。
export default function Logo({ size = 22, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#2563eb" />
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M11.5 24 V11" />
        <path d="M11.5 15.5 C11.5 12 18.3 12 18.3 15.5" />
      </g>
      <path
        d="M22.5 5 L23.6 6.9 L25.5 8 L23.6 9.1 L22.5 11 L21.4 9.1 L19.5 8 L21.4 6.9 Z"
        fill="#ffffff"
      />
    </svg>
  );
}
