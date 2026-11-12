import { RootDocument } from "@/components/layout/RootDocument";
import { rootMetadata, VIEWPORT } from "@/lib/i18n/metadata";

export const metadata = rootMetadata("pt");
export const viewport = VIEWPORT;

/** Root layout of the dev-only /lab pages (each language tree and the demos have their own). */
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="pt">{children}</RootDocument>;
}
