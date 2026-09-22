import { Bloom, EffectComposer } from '@react-three/postprocessing';

export function Effects() {
  return (
    <EffectComposer>
      <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.3} mipmapBlur />
    </EffectComposer>
  );
}
