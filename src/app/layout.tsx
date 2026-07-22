import type { Metadata } from "next";
import "./globals.css";
import PublicChrome from "@/components/PublicChrome";
import { websiteLd, JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/config";
import Script from "next/script";

const GA_MEASUREMENT_ID = "G-XRQN2R4V89";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: ["AI", "人工智能", "论文", "开源项目", "AI资讯", "arXiv", "GitHub", "大模型"],
  authors: [{ name: SITE.author }],
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "hackcv 精选" },
        { url: "/feed/all.xml", title: "hackcv 全部" },
        { url: "/feed/daily.xml", title: "hackcv 每日简报" },
      ],
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
  robots: { index: true, follow: true },
};

const themeScript = `(function(){try{var t=localStorage.getItem('hackcv-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd data={websiteLd()} />
      </head>
      <body>
        <PublicChrome>{children}</PublicChrome>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
