import { labIndexMetadata } from "@/components/lab/meta";
import { LabIndex } from "@/components/lab/LabIndex";

export const metadata = labIndexMetadata("pt");

/** /laboratorio — listing in content/lab. */
export default function Page() {
  return <LabIndex lang="pt" />;
}
