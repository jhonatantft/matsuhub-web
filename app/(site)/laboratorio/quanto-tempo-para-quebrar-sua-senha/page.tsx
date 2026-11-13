import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";
import { PasswordLab } from "@/components/lab/password/PasswordLab";

export const metadata = labItemMetadata("password", "pt");

export default function Page() {
  return (
    <LabItemPage id="password" lang="pt">
      <PasswordLab lang="pt" />
    </LabItemPage>
  );
}
