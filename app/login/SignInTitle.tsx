"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postDemoLogin } from "@/components/demo-login-client";

/**
 * Triple-click within ~650ms signs in as the demo issuer account (same as "Demo issuer" button).
 */
export function SignInTitle() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });

  return (
    <div className="mb-2">
      <h1
        className="cursor-default text-xl font-semibold text-slate-900"
        title="Triple-click quickly for demo issuer sign-in"
        onClick={() => {
          setErr(null);
          if (ref.current.timer) clearTimeout(ref.current.timer);
          ref.current.count += 1;
          if (ref.current.count >= 3) {
            ref.current.count = 0;
            ref.current.timer = null;
            void (async () => {
              const r = await postDemoLogin("issuer");
              if (r.ok) {
                router.refresh();
                router.push("/issuer");
              } else {
                setErr(r.error);
              }
            })();
            return;
          }
          ref.current.timer = setTimeout(() => {
            ref.current.count = 0;
            ref.current.timer = null;
          }, 650);
        }}
      >
        Sign in
      </h1>
      {err && (
        <p className="mt-1 text-sm text-red-700">{err}</p>
      )}
    </div>
  );
}
