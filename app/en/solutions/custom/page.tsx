import { customMetadata } from "@/components/segments/meta";
import { CustomPage } from "@/components/segments/custom/CustomPage";
import { SEGMENT_HREFS_EN } from "@/content/segments";

export const metadata = customMetadata("en");

/** /en/solutions/custom — copy in content/custom.ts. */
export default function Page() {
  return <CustomPage lang="en" hrefs={SEGMENT_HREFS_EN} />;
}
