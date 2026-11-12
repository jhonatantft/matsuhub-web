import { NotFoundView } from "@/components/layout/NotFoundView";

/** A notFound() inside the English site (unmatched URLs get app/global-not-found, in English under /en). */
export default function NotFound() {
  return <NotFoundView lang="en" />;
}
