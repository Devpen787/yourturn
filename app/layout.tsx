import type { Metadata } from "next";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "YourTurn",
  description: "Book, keep, and pass on scarce sessions under provider rules.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          <SiteHeader sessionUser={sessionUser} />
          <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
