import { segmentMetadata } from "@/components/segments/meta";
import { SegmentPage } from "@/components/segments/SegmentPage";
import { SEGMENT_HREFS_EN, segmentById } from "@/content/segments";

export const metadata = segmentMetadata("clinicas", "en");

/** /en/solutions/clinics — copy in content/segments.ts. */
export default function Page() {
  return <SegmentPage segment={segmentById("clinicas")} lang="en" hrefs={SEGMENT_HREFS_EN} />;
}
