import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Costflow",
  description: "Claude Code usage analytics dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
