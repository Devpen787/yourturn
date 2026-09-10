"use client";

import { useSearchParams } from "next/navigation";
import GoldenRecoveryClient from "./GoldenRecoveryClient";
import Xc01Client from "./Xc01Client";

export default function ProductPreviewPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (view?.startsWith("xc-")) {
    return <Xc01Client />;
  }

  return <GoldenRecoveryClient />;
}
