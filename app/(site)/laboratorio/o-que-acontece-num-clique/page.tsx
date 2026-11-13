import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";
import { OneClick } from "@/components/lab/click/OneClick";

export const metadata = labItemMetadata("one-click", "pt");

export default function Page() {
  return (
    <LabItemPage id="one-click" lang="pt">
      <OneClick lang="pt" />
    </LabItemPage>
  );
}
