import "./globals.css";

export const metadata = {
  title: "Ministry Assessments — Mission USA",
  description: "Free, Scripture-grounded assessments for the CHC family.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Self-hosted fonts — preload the faces above the fold so first paint
            uses the intended type. @font-face lives in globals.css. */}
        <link rel="preload" href="/fonts/fraunces-600.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-600.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
