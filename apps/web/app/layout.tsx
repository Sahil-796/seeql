import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ServerStatus } from "@/components/ServerStatus";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seeql - SQL Playground & Schema Visualizer",
  description:
    "Prototype queries, visualize schemas, and generate mock data instantly. Write a SELECT query and watch as we infer the schema and populate it with realistic data.",
  keywords: [
    "SQL",
    "playground",
    "schema",
    "visualizer",
    "mock data",
    "database",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          <ServerStatus />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
