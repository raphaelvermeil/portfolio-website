import siteRaw from '../../content/site.yml?raw';
import skillsRaw from '../../content/skills.yml?raw';
import aboutRaw from '../../content/about.md?raw';
import { parseSite, parseSkills } from './content';

export const site = parseSite(siteRaw);
export const skills = parseSkills(skillsRaw);
export const aboutMarkdown = aboutRaw;
