import { HomePage } from "@/components/home/HomePage";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata = pageMetadata("home", "en");

export default function Page() {
  return <HomePage lang="en" />;
}
