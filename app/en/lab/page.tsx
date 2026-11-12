import { labIndexMetadata } from "@/components/lab/meta";
import { LabIndex } from "@/components/lab/LabIndex";

export const metadata = labIndexMetadata("en");

/** /en/lab — listing in content/lab. */
export default function Page() {
  return <LabIndex lang="en" />;
}
