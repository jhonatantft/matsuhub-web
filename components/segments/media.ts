import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Segment } from "@/content/segments";

/**
 * Server-only: whether a file under /public exists. Demo media can still be on its way (a new
 * demo's recording lands last), so pages ask before pointing at a file and fall back to a
 * branded panel instead of a broken image.
 */
export function publicFile(path: string): string | null {
  return existsSync(join(process.cwd(), "public", path)) ? path : null;
}

export type SegmentMedia = { video: string | null; poster: string | null; still: string | null };

export function segmentMedia(segment: Segment): SegmentMedia {
  return {
    video: publicFile(segment.preview.video),
    poster: publicFile(segment.preview.poster) ?? (segment.preview.fallback ? publicFile(segment.preview.fallback) : null),
    still: publicFile(segment.still.src),
  };
}
