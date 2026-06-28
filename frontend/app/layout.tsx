import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alma — Lead Management",
  description: "Submit your profile for an immigration assessment, or sign in as an attorney.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
