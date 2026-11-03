import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/i18nServer";
import { I18nProvider } from "@/components/I18nProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NewFileSharer",
  description: "Secure, expiring file sharing links",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
