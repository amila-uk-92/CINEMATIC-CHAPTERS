import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const condensed = localFont({
  src: [
    {
      path: "../public/fonts/BarlowCondensed-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/BarlowCondensed-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-condensed",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Cinematic Chapters · Photography in Leicester",
  description:
    "Two perspectives. One story. Photography portfolio, session requests and private client galleries.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={condensed.variable}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
