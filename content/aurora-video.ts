/**
 * AI-generated camera moves between the Aurora stills (public/aurora/video).
 * Each clip starts on one still and ends on the next, so a still can hand over to its clip
 * and back with a short cross-fade. 24 fps, 124 frames (~5.17 s), no audio, a keyframe every
 * 8 frames so the clips can be scrubbed by scroll as well as played.
 *   src / small       → forward, 1600×900 and 960×540
 *   reverse / …Small  → the same move played backwards (for "voltar")
 */
export type AuroraTransition = {
  /** View ids as used by the stage: "dusk" (exterior at blue hour), "plan", "living", "suite". */
  from: string;
  to: string;
  src: string;
  small: string;
  reverse: string;
  reverseSmall: string;
  /** Seconds. */
  duration: number;
};

const clip = (from: string, to: string, file: string): AuroraTransition => ({
  from,
  to,
  src: `/aurora/video/${file}.mp4`,
  small: `/aurora/video/${file}-960.mp4`,
  reverse: `/aurora/video/${file}-rev.mp4`,
  reverseSmall: `/aurora/video/${file}-rev-960.mp4`,
  duration: 124 / 24,
});

export const AURORA_TRANSITIONS: AuroraTransition[] = [
  // The camera climbs the tower at dusk, reaches the top floors and opens into the cut-away plan.
  clip("dusk", "plan", "exterior-plan"),
  // The plan → living and living → suite clips were retired: they were filmed from the first room
  // photos, which did not match the plan. Regenerate them from the current photos before re-adding.
];

/** The clip that goes from one view to another, in either direction (`backwards` = play the reverse file). */
export function findTransition(from: string, to: string): { clip: AuroraTransition; backwards: boolean } | null {
  for (const c of AURORA_TRANSITIONS) {
    if (c.from === from && c.to === to) return { clip: c, backwards: false };
    if (c.from === to && c.to === from) return { clip: c, backwards: true };
  }
  return null;
}
