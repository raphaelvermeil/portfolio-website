import siteRaw from '../../content/site.yml?raw';
import skillsRaw from '../../content/skills.yml?raw';
import aboutRaw from '../../content/about.md?raw';
import experienceRaw from '../../content/experience.yml?raw';
import educationRaw from '../../content/education.yml?raw';
import { parseSite, parseSkills, parseTimeline } from './content';

export const site = parseSite(siteRaw);
export const skills = parseSkills(skillsRaw);
export const aboutMarkdown = aboutRaw;
export const experience = parseTimeline(experienceRaw, 'experience.yml');
export const education = parseTimeline(educationRaw, 'education.yml');
