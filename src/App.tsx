import { useRoute } from './lib/router';
import { Footer } from './ui/Footer';
import { MachineSection } from './ui/MachineSection';
import { ProjectPage } from './ui/ProjectPage';
import { About } from './ui/sections/About';
import { Contact } from './ui/sections/Contact';
import { Projects } from './ui/sections/Projects';
import { Skills } from './ui/sections/Skills';

/**
 * The home page is one scroll spine: type, then the machine, then the work, then
 * who made it. A project route replaces it entirely with that project's article.
 */
function Home() {
  return (
    <main>
      <MachineSection />
      <Projects />
      <About />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}

export default function App() {
  const route = useRoute();
  return route.kind === 'project' ? <ProjectPage id={route.id} /> : <Home />;
}
