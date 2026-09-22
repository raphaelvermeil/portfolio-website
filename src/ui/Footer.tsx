import { meta } from '../lib/data';

export function Footer() {
  return (
    <footer className="footer label">
      Drawn with Three.js · rebuilt {meta.fetchedAt.slice(0, 10)}
    </footer>
  );
}
