import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Суши Чулым — роллы с доставкой", template: "%s | Суши Чулым" },
  description: "Свежие роллы и сеты с доставкой по Чулыму.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
