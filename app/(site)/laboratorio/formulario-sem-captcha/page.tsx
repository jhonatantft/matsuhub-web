import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";

export const metadata = labItemMetadata("public-forms", "pt");

export default function Page() {
  return <LabItemPage id="public-forms" lang="pt" />;
}
