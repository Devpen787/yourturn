import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Register · Booked Rights v1",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Create account</h1>
      <p className="mb-6 text-sm text-slate-600">
        Password must be at least 8 characters. Same Redis (Upstash) as slots /
        listings. Hedera demo still uses env guest keys + actor selector.
      </p>
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sky-800 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
