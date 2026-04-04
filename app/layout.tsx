import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "YourTurn",
  description: "Book, keep, and pass on scarce sessions under provider rules.",
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
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-semibold text-slate-800">
              YourTurn
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/slots" className="text-slate-700 hover:text-slate-950">
                Browse
              </Link>
              <Link href="/my-bookings" className="text-slate-700 hover:text-slate-950">
                My passes
              </Link>
              <Link
                href="/issuer"
                className="text-slate-500 hover:text-slate-900"
              >
                Provider dashboard
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
