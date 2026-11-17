/**
 * PLACEHOLDER posts for the news/blog panel. There is no posts table or API yet;
 * replace this with a fetch once the backend has one.
 */
export interface NewsPost {
  id: string;
  title: string;
  date: string; // ISO day
  excerpt: string;
  body: string[];
}

export const NEWS: NewsPost[] = [
  {
    id: "new-map",
    title: "The map is now a subway map",
    date: "2026-11-17",
    excerpt: "The whole city on one screen, the way you already know it from the train.",
    body: [
      "The city on cozy is now drawn as the subway diagram: every line in its MTA colour, every station named, and the boroughs stretched so the busy parts get the room they need.",
      "Zoom with the buttons in the corner, a scroll wheel or a pinch. Events sit where they would be on the diagram, so the nearest station is right there next to the dot.",
    ],
  },
  {
    id: "heat",
    title: "What the heat means",
    date: "2026-11-10",
    excerpt: "Bigger, pinker dots are where the night is going right now.",
    body: [
      "Every event on the map has a heat between 0 and 100. It rises as an event gets closer, peaks while it is on, and gets a push from how popular it is and how many people are talking about it.",
      "On the map, heat is the size and colour of the dot: small and blue is quiet, big and hot pink is where everyone is.",
    ],
  },
  {
    id: "sound",
    title: "A soundtrack that follows the clock",
    date: "2026-11-03",
    excerpt: "The music changes through the night, and picks up near busy spots.",
    body: [
      "cozy always has music on. It moves through scenes as the night goes: daylight, dusk, prime, peak and afterhours.",
      "Move the map toward somewhere hot and the rhythm comes up with it. The mute button is in the bottom corner if you need quiet.",
    ],
  },
  {
    id: "say-something",
    title: "Say something",
    date: "2026-10-27",
    excerpt: "Pick an event, leave a note. The social feed shows what the whole city is saying.",
    body: [
      "Every event has its own thread. Pick one on the map and post from the social feed; your note shows up for everyone straight away.",
      "You get a random handle the first time you visit. Accounts come later.",
    ],
  },
];
