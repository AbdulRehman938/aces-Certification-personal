"use client";

import { Suspense } from "react";
import LegalPage from "../modules/legal/page";

export default function Page() {
  return (
    <Suspense>
      <LegalPage />
    </Suspense>
  );
}
