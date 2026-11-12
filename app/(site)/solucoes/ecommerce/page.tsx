import { segmentMetadata } from "@/components/segments/meta";
import { SegmentPage } from "@/components/segments/SegmentPage";
import { segmentById } from "@/content/segments";

export const metadata = segmentMetadata("ecommerce");

/** /solucoes/ecommerce — copy in content/segments.ts. */
export default function Page() {
  return <SegmentPage segment={segmentById("ecommerce")} />;
}
