import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalScout AI",
  description: "Turn job postings into B2B buying signals and Slack-ready outreach."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
