import { SemanticSearch } from "@/components/lab/search/SemanticSearch";
import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";

export const metadata = labItemMetadata("semantic-search", "pt");

export default function Page() {
  return (
    <LabItemPage id="semantic-search" lang="pt">
      <SemanticSearch lang="pt" />
    </LabItemPage>
  );
}
