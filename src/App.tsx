import { Footer } from './ui/Footer';
import { MachineSection } from './ui/MachineSection';
import { About } from './ui/sections/About';
import { Contact } from './ui/sections/Contact';
import { Skills } from './ui/sections/Skills';

export default function App() {
  return (
    <main>
      <MachineSection />
      <About />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}
