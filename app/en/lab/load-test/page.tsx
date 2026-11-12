import { LoadTest } from "@/components/lab/load/LoadTest";
import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";

export const metadata = labItemMetadata("load-test", "en");

export default function Page() {
  return (
    <LabItemPage id="load-test" lang="en">
      <LoadTest lang="en" />
    </LabItemPage>
  );
}
