import { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial } from 'three';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  float gridLine(float coord, float cells, float width) {
    float scaled = coord * cells;
    float f = abs(fract(scaled - 0.5) - 0.5) / fwidth(scaled);
    return 1.0 - min(f / width, 1.0);
  }
  void main() {
    float minor = max(gridLine(vUv.x, 96.0, 1.0), gridLine(vUv.y, 48.0, 1.0));
    float major = max(gridLine(vUv.x, 24.0, 1.2), gridLine(vUv.y, 12.0, 1.2));
    float alpha = minor * 0.025 + major * 0.05;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function GridBackdrop() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uColor: { value: new Color('#78a0ff') } },
        transparent: true,
        depthWrite: false,
        side: BackSide,
      }),
    [],
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[40, 48, 24]} />
    </mesh>
  );
}
