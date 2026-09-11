"use client";

import { useSearchParams } from "next/navigation";
import GoldenRecoveryClient from "./GoldenRecoveryClient";
import Xc01Client from "./Xc01Client";
import CompletionClient from "./CompletionClient";
import ProviderLifecycleClient from "./ProviderLifecycleClient";

export default function ProductPreviewPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (view?.startsWith("xc3-")) {
    return <ProviderLifecycleClient />;
  }

  if (view?.startsWith("xc2-")) {
    return <CompletionClient />;
  }

  if (view?.startsWith("xc-")) {
    return <Xc01Client />;
  }

  return <GoldenRecoveryClient />;
}
