import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Tender Intelligence Dashboard",
  description:
    "Real-time government tender monitoring across GeM, Telangana & Andhra Pradesh eProcurement portals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen scrollbar-thin">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
