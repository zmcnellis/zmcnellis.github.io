export interface Project {
  /** Stable key; also used for internal route slugs under /fun. */
  slug: string;
  title: string;
  blurb: string;
  /** Optional highlight stat, e.g. "115k+ downloads". */
  stat?: string;
  /** Internal route (e.g. "/fun/life") or external URL. */
  href: string;
  /** True when href points off-site (opens in a new tab with a ↗ affordance). */
  external: boolean;
  tags?: string[];
}

/**
 * The "Fun stuff" showcase. Add a new entry here and it appears on /fun
 * automatically. Internal projects get a detail page at src/pages/fun/<slug>.astro.
 */
export const projects: Project[] = [
  {
    slug: "fluid",
    title: "Fluid Background",
    blurb:
      "The drifting blobs behind every page are a real-time fluid simulation I built from scratch — with several modes you can switch between using the ✦ control in the corner.",
    href: "/fun/fluid",
    external: false,
    tags: ["WebGL", "Graphics"],
  },
  {
    slug: "life",
    title: "Conway's Game of Life",
    blurb:
      "The classic cellular automaton, reimagined as soft-body metaballs — cells spring to life, melt away, and shift through a rainbow as they age.",
    href: "/fun/life",
    external: false,
    tags: ["Interactive", "Canvas"],
  },
  {
    slug: "jelly",
    title: "Jelly",
    blurb:
      "A soft-body physics toy — squishy jelly blobs built from mass-springs and internal pressure that you can grab, fling, and watch wobble.",
    href: "/fun/jelly",
    external: false,
    tags: ["Interactive", "Physics"],
  },
  {
    slug: "souls-quick-menu",
    title: "Souls Quick Menu",
    blurb:
      "A Skyrim mod that brings a Dark Souls–style radial quick menu to the game, for fast weapon, spell, and item swapping mid-combat.",
    stat: "115k+ downloads",
    href: "/fun/souls-quick-menu",
    external: false,
    tags: ["Skyrim mod"],
  },
  {
    slug: "desk",
    title: "Desk Scene",
    blurb:
      "A cozy CSS-only recreation of my desk — flickering lamp, steaming coffee, and a live alarm clock. Almost entirely pure HTML & CSS.",
    href: "/fun/desk",
    external: false,
    tags: ["CSS art", "CodePen"],
  },
  {
    slug: "marriott",
    title: "Marriott 360° AR Experience",
    blurb:
      "A WebVR experience for a Marriott conference — 360° panoramic hotel tours viewable in Google Cardboard or Oculus, scaled to ~1,000 concurrent users.",
    href: "/fun/marriott",
    external: false,
    tags: ["WebVR", "React"],
  },
  {
    slug: "coderx",
    title: "Code℞",
    blurb:
      "The applied prototype from my master's thesis — an online evaluator that grades C++ and Python solutions on code-quality metrics, not just correctness, to teach beginners to write better code.",
    href: "/fun/coderx",
    external: false,
    tags: ["Research", "Education"],
  },
];
