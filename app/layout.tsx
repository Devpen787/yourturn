import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booked Rights v1",
  description:
    "Hedera HTS + HCS transferable booking rights — demo: 1 ℏ = US$1 on testnet, 10% royalty in USD + ℏ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader sessionUser={sessionUser} />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-slate-50 py-4 text-center text-[11px] text-slate-600">
          <div className="mx-auto max-w-5xl px-4">
            Demo pricing: 1 ℏ = US$1 on testnet · 10% issuer royalty shown in USD
            and ℏ · not a real FX rate
          </div>
        </footer>
      </body>
    </html>
  );
}
