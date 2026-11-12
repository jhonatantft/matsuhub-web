import { solutionsMetadata } from "@/components/segments/meta";
import { SolutionsIndex } from "@/components/segments/SolutionsIndex";
import { SEGMENT_HREFS_PT } from "@/content/segments";

export const metadata = solutionsMetadata("pt");

/** /solucoes: the four segment pages (copy in content/segments.ts). */
export default function SolutionsPage() {
  return <SolutionsIndex lang="pt" hrefs={SEGMENT_HREFS_PT} />;
}
