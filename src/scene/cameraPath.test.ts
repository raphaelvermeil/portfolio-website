import { describe, expect, it } from 'vitest';
import { CAMERA_PATH, cameraAt, framingDistance, posePosition, type CameraKey } from './cameraPath';

const path: CameraKey[] = [
  { at: 0, azimuth: 0, elevation: 0, distance: 1 },
  { at: 0.5, azimuth: 90, elevation: 20, distance: 2 },
  { at: 1, azimuth: 180, elevation: 0, distance: 1 },
];

describe('cameraAt', () => {
  it('sits exactly on a key at its own progress', () => {
    expect(cameraAt(path, 0)).toEqual({ azimuth: 0, elevation: 0, distance: 1 });
    expect(cameraAt(path, 0.5)).toEqual({ azimuth: 90, elevation: 20, distance: 2 });
    expect(cameraAt(path, 1)).toEqual({ azimuth: 180, elevation: 0, distance: 1 });
  });

  it('interpolates between keys', () => {
    const mid = cameraAt(path, 0.25);
    expect(mid.azimuth).toBeGreaterThan(0);
    expect(mid.azimuth).toBeLessThan(90);
    expect(mid.distance).toBeGreaterThan(1);
  });

  it('eases rather than running linearly', () => {
    // Smoothstep is flat at the ends, so a quarter in covers less than a quarter of the way.
    expect(cameraAt(path, 0.0625).azimuth).toBeLessThan(90 * 0.125);
  });

  it('clamps outside the range', () => {
    expect(cameraAt(path, -3)).toEqual(cameraAt(path, 0));
    expect(cameraAt(path, 7)).toEqual(cameraAt(path, 1));
  });

  it('moves continuously across key boundaries', () => {
    let previous = cameraAt(path, 0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const pose = cameraAt(path, p);
      expect(Math.abs(pose.azimuth - previous.azimuth)).toBeLessThan(6);
      expect(Math.abs(pose.elevation - previous.elevation)).toBeLessThan(6);
      previous = pose;
    }
  });

  it('survives a degenerate path', () => {
    expect(cameraAt([], 0.4)).toEqual({ azimuth: 0, elevation: 0, distance: 1 });
    const single: CameraKey[] = [{ at: 0, azimuth: 5, elevation: 5, distance: 1 }];
    expect(cameraAt(single, 0.9)).toEqual({ azimuth: 5, elevation: 5, distance: 1 });
  });
});

describe('CAMERA_PATH', () => {
  it('runs from 0 to 1 in order', () => {
    expect(CAMERA_PATH[0].at).toBe(0);
    expect(CAMERA_PATH[CAMERA_PATH.length - 1].at).toBe(1);
    for (let i = 1; i < CAMERA_PATH.length; i++) expect(CAMERA_PATH[i].at).toBeGreaterThan(CAMERA_PATH[i - 1].at);
  });

  it('turns the machine a long way without ever facing straight down the axis', () => {
    const azimuths = CAMERA_PATH.map((k) => k.azimuth);
    expect(Math.max(...azimuths) - Math.min(...azimuths)).toBeGreaterThan(60);
    // 90 degrees is exactly end-on, where the assembly collapses to a single disc.
    for (const a of azimuths) expect(Math.abs(a)).toBeLessThan(90);
  });

  it('views the machine from both above and below', () => {
    const elevations = CAMERA_PATH.map((k) => k.elevation);
    expect(Math.max(...elevations)).toBeGreaterThan(0);
    expect(Math.min(...elevations)).toBeLessThan(0);
  });

  it('finishes looking down on the machine, where the fan reads', () => {
    const last = CAMERA_PATH[CAMERA_PATH.length - 1];
    expect(last.elevation).toBeGreaterThan(45);
    expect(last.elevation).toBeLessThan(85);
  });
});

describe('posePosition', () => {
  it('places the camera broadside at zero azimuth', () => {
    const [x, y, z] = posePosition({ azimuth: 0, elevation: 0, distance: 1 }, 10);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(10, 6);
  });

  it('places it on the machine axis at ninety degrees', () => {
    const [x, y, z] = posePosition({ azimuth: 90, elevation: 0, distance: 1 }, 10);
    expect(x).toBeCloseTo(10, 6);
    expect(z).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  it('raises the camera with elevation and keeps the distance', () => {
    const [, y] = posePosition({ azimuth: 0, elevation: 30, distance: 1 }, 10);
    expect(y).toBeCloseTo(5, 6);
    const [x2, y2, z2] = posePosition({ azimuth: 40, elevation: -20, distance: 1 }, 12);
    expect(Math.hypot(x2, y2, z2)).toBeCloseTo(12, 6);
    expect(y2).toBeLessThan(0);
  });
});

describe('framingDistance', () => {
  const LENGTH = 15;
  const DIAMETER = 3.2;
  const FOV = 22;
  const ASPECT = 1.6;
  const pose = (azimuth: number, elevation = 0, distance = 1) => ({ azimuth, elevation, distance });
  const fit = (p: ReturnType<typeof pose>) => framingDistance(p, LENGTH, DIAMETER, FOV, ASPECT, 1);

  /** Half-extents of the machine on screen at a given distance, from the same geometry. */
  function onScreen(p: ReturnType<typeof pose>, distance: number) {
    const [x, y, z] = posePosition(p, distance);
    const horizontal = Math.hypot(x, z);
    const halfW = Math.abs((LENGTH / 2) * (z / horizontal)) + DIAMETER / 2;
    const halfH = Math.abs((LENGTH / 2) * ((-y * x) / (horizontal * distance))) + DIAMETER / 2;
    const tanV = Math.tan((FOV * Math.PI) / 180 / 2);
    return { widthRatio: halfW / (distance * tanV * ASPECT), heightRatio: halfH / (distance * tanV) };
  }

  it('fits the machine exactly at margin 1, broadside', () => {
    const p = pose(0);
    const { widthRatio, heightRatio } = onScreen(p, fit(p));
    expect(Math.max(widthRatio, heightRatio)).toBeCloseTo(1, 6);
  });

  it('keeps the machine inside the frame at every pose on the path', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      const p = cameraAt(CAMERA_PATH, t);
      const d = framingDistance(p, LENGTH, DIAMETER, FOV, ASPECT);
      const { widthRatio, heightRatio } = onScreen(p, d);
      expect(Math.max(widthRatio, heightRatio)).toBeLessThanOrEqual(1);
    }
  });

  it('comes closer as the machine turns towards end-on', () => {
    expect(fit(pose(60))).toBeLessThan(fit(pose(0)));
  });

  it('stands further back when the tilt pushes it into the short axis', () => {
    expect(fit(pose(45, 30))).toBeGreaterThan(fit(pose(45, 0)));
  });

  it('never collapses onto the machine when seen straight down the axis', () => {
    expect(fit(pose(90))).toBeGreaterThan(DIAMETER / 2);
  });

  it('scales with the pose distance multiplier and the margin', () => {
    expect(fit(pose(0, 0, 2))).toBeCloseTo(fit(pose(0)) * 2, 6);
    expect(framingDistance(pose(0), LENGTH, DIAMETER, FOV, ASPECT, 1.5)).toBeCloseTo(fit(pose(0)) * 1.5, 6);
  });
});
