import { useLayoutEffect, useMemo, useRef } from 'react';
import { useRoute } from './lib/router';
import { education, experience } from './lib/siteContent';
import { createScrollMemory, routeKey } from './lib/scrollMemory';
import { Footer } from './ui/Footer';
import { Landing } from './ui/Landing';
import { ProjectPage } from './ui/ProjectPage';
import { About } from './ui/sections/About';
import { Contact } from './ui/sections/Contact';
import { Projects } from './ui/sections/Projects';
import { Skills } from './ui/sections/Skills';
import { Timeline } from './ui/sections/Timeline';

/**
 * The home page is one scroll spine: type, who made it, then the work. A
 * project route replaces it entirely with that project's article.
 */
function Home() {
  return (
    <main>
      <Landing />
      <About />
      <Projects />
      <Timeline id="experience" title="Experience" number={3} entries={experience} />
      <Timeline id="education" title="Education" number={4} entries={education} />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}

/**
 * Remembers where each route was scrolled to and puts it back on return.
 *
 * The browser's own restoration cannot do this here: the two routes are very
 * different heights, and it restores after the incoming page has remounted and
 * grown, so it lands somewhere else entirely. Turning it off and restoring
 * ourselves also keeps the machine from being swept through its whole timeline
 * on the way.
 */
function useRememberedScroll(key: string) {
  const memory = useMemo(createScrollMemory, []);
  const current = useRef(key);

  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const record = () => memory.save(current.current, window.scrollY);
    window.addEventListener('scroll', record, { passive: true });
    return () => window.removeEventListener('scroll', record);
  }, [memory]);

  useLayoutEffect(() => {
    current.current = key;
    window.scrollTo(0, memory.recall(key));
  }, [key, memory]);
}

export default function App() {
  const route = useRoute();
  useRememberedScroll(routeKey(route));
  return route.kind === 'project' ? <ProjectPage id={route.id} /> : <Home />;
}
