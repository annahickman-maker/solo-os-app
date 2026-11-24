// Solo OS Team page settings. Change these two when the team server is
// deployed and the course has its address.
//
// SOLO_OS_TEAM_ORIGIN must also be listed, exactly, in this folder's
// manifest.json under host.networkOrigins: the app only lets the page reach
// origins its manifest declares (index.test.ts checks they match).

/** The team server (solo-os-team-server), with no trailing slash. */
export const SOLO_OS_TEAM_ORIGIN = "https://solo-os-team.annahickman-maker.workers.dev";

/** Where the footer's "Back to the course" link goes. */
export const SOLO_OS_COURSE_URL = "https://course.example.com";

export const TEAM_COPY = {
  title: "Team",
  headline: "Meet your Solo OS team",
  intro:
    "Hire them in order, starting with Fern, your Manager. Paste the access link from each employee's lesson to unlock them.",
  course: "Back to the course",
} as const;
