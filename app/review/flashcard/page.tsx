import { Suspense } from "react";
import FlashcardMode from "@/components/review/FlashcardMode";

export default function FlashcardPage() {
  return (
    <Suspense>
      <FlashcardMode />
    </Suspense>
  );
}
