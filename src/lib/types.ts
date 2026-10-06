export interface Project {
  id: string;
  title: string;
  blurb: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  sizeKb: number;
  /** Shown on the card and the project page. */
  createdAt: string;
  /** Not shown; feeds the activity score the grid is ordered by. */
  pushedAt: string;
  topics: string[];
  /** Whole README, rendered on the project's own page. */
  readme: string | null;
  featured: boolean;
  image: string | null;
  activity: number;
}

export interface Meta {
  fetchedAt: string;
  avatarUrl: string;
  profileUrl: string;
  name: string;
  bio: string | null;
}
