import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";

export const metadata = labItemMetadata("public-forms", "en");

export default function Page() {
  return <LabItemPage id="public-forms" lang="en" />;
}
