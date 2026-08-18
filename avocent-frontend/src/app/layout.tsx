import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avocent Health Centre",
  description: "Secure clinic-first HIMS and telemedicine frontend for Avocent Health Centre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
