import { Suspense } from "react";
import QuizMode from "@/components/review/QuizMode";

export default function QuizPage() {
  return (
    <Suspense>
      <QuizMode />
    </Suspense>
  );
}
