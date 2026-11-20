import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "TANDEM",
  description: "Deux vies. Un équilibre. Le budget du quotidien de Guillaume et Emma.",
  manifest: "/manifest.webmanifest",
  applicationName: "TANDEM",
  appleWebApp: { capable: true, title: "TANDEM", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#120E1F",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // TANDEM est en thème sombre partout
    <html lang="fr" className="dark">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
