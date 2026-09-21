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
  pushedAt: string;
  topics: string[];
  readmeExcerpt: string | null;
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
