import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Prompt Architect",
  description: "Transform voice ideas into optimized AI prompts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="min-h-screen lg:flex">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
