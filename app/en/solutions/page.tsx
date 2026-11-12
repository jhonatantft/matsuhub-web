import { solutionsMetadata } from "@/components/segments/meta";
import { SolutionsIndex } from "@/components/segments/SolutionsIndex";
import { SEGMENT_HREFS_EN } from "@/content/segments";

export const metadata = solutionsMetadata("en");

/** /en/solutions: the four segment pages (copy in content/segments.ts). */
export default function SolutionsPage() {
  return <SolutionsIndex lang="en" hrefs={SEGMENT_HREFS_EN} />;
}
