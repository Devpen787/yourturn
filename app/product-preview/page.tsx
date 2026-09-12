"use client";

import { useSearchParams } from "next/navigation";
import GoldenRecoveryClient from "./GoldenRecoveryClient";
import Xc01Client from "./Xc01Client";
import CompletionClient from "./CompletionClient";
import ProviderLifecycleClient from "./ProviderLifecycleClient";
import ProviderR3Client from "./ProviderR3Client";
import BobBookingsR3Client from "./BobBookingsR3Client";

export default function ProductPreviewPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (view === "xc2-bob-list") {
    return <BobBookingsR3Client />;
  }

  if (view?.startsWith("xc3-provider-session")) {
    return <ProviderR3Client />;
  }

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
