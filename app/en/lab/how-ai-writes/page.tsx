import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";
import { NextWord } from "@/components/lab/nextword/NextWord";

export const metadata = labItemMetadata("next-word", "en");

export default function Page() {
  return (
    <LabItemPage id="next-word" lang="en">
      <NextWord lang="en" />
    </LabItemPage>
  );
}
