import { Suspense } from "react";
import { PaymentsPage } from "../../modules/profile/payments";

export default function Page() {
  return (
    <Suspense>
      <PaymentsPage />
    </Suspense>
  );
}
