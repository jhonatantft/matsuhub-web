import { customMetadata } from "@/components/segments/meta";
import { CustomPage } from "@/components/segments/custom/CustomPage";

export const metadata = customMetadata("pt");

/** /solucoes/sob-medida — copy in content/custom.ts. */
export default function Page() {
  return <CustomPage lang="pt" />;
}
