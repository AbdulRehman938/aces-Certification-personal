import { Suspense } from "react";
import { AssessmentPage } from "../modules/assessment/index";

export default function Page() {
  return (
    <Suspense>
      <AssessmentPage />
    </Suspense>
  );
}
