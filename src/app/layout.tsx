import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import Providers from "./providers";

const publicSans = localFont({
  src: "../fonts/Public_Sans/PublicSans-VariableFont_wght.ttf",
  variable: "--font-public-sans",
  weight: "100 900",
});

const archivo = localFont({
  src: "../fonts/Archivo/Archivo-VariableFont_wdth,wght.ttf",
  variable: "--font-archivo",
  weight: "100 900",
  preload: false,
});

const plusJakartaSans = localFont({
  src: "../fonts/Plus_Jakarta_Sans/PlusJakartaSans-VariableFont_wght.ttf",
  variable: "--font-sans",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: "ACES Certification",
  description:
    "ACES Certification portal — view and access certification details",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${publicSans.variable} ${archivo.variable} ${plusJakartaSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
