import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";

export const metadata = labItemMetadata("one-loop", "pt");

export default function Page() {
  return <LabItemPage id="one-loop" lang="pt" />;
}
