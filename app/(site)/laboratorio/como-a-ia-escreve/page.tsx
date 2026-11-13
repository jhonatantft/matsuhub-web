import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";
import { NextWord } from "@/components/lab/nextword/NextWord";

export const metadata = labItemMetadata("next-word", "pt");

export default function Page() {
  return (
    <LabItemPage id="next-word" lang="pt">
      <NextWord lang="pt" />
    </LabItemPage>
  );
}
