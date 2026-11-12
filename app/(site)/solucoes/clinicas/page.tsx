import { segmentMetadata } from "@/components/segments/meta";
import { SegmentPage } from "@/components/segments/SegmentPage";
import { segmentById } from "@/content/segments";

export const metadata = segmentMetadata("clinicas");

/** /solucoes/clinicas — copy in content/segments.ts. */
export default function Page() {
  return <SegmentPage segment={segmentById("clinicas")} />;
}
