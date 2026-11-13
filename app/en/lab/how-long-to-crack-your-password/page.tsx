import { LabItemPage } from "@/components/lab/LabItemPage";
import { labItemMetadata } from "@/components/lab/meta";
import { PasswordLab } from "@/components/lab/password/PasswordLab";

export const metadata = labItemMetadata("password", "en");

export default function Page() {
  return (
    <LabItemPage id="password" lang="en">
      <PasswordLab lang="en" />
    </LabItemPage>
  );
}
