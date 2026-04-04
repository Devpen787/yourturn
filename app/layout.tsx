import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booked Rights v1",
  description: "Hedera HTS + HCS transferable booking rights (demo)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
            <span className="font-semibold text-slate-800">Booked Rights v1</span>
            <nav className="flex flex-wrap gap-3 text-sm text-blue-700">
              <Link href="/issuer">Issuer</Link>
              <Link href="/slots">Slots</Link>
              <Link href="/my-bookings">My bookings</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
