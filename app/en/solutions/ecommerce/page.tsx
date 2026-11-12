import { segmentMetadata } from "@/components/segments/meta";
import { SegmentPage } from "@/components/segments/SegmentPage";
import { SEGMENT_HREFS_EN, segmentById } from "@/content/segments";

export const metadata = segmentMetadata("ecommerce", "en");

/** /en/solutions/ecommerce — copy in content/segments.ts. */
export default function Page() {
  return <SegmentPage segment={segmentById("ecommerce")} lang="en" hrefs={SEGMENT_HREFS_EN} />;
}
