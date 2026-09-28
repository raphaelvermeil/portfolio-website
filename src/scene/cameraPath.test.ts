import { describe, expect, it } from 'vitest';
import { CAMERA_PATH, cameraAt, framingDistance, posePosition, type CameraKey } from './cameraPath';
import { ACTS } from './timeline';

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

  it('swings and rises without ever running backwards', () => {
    const azimuths = CAMERA_PATH.map((k) => k.azimuth);
    const elevations = CAMERA_PATH.map((k) => k.elevation);
    expect(azimuths).toEqual([...azimuths].sort((a, b) => a - b));
    expect(elevations).toEqual([...elevations].sort((a, b) => a - b));
  });

  it('starts broadside and low', () => {
    expect(Math.abs(CAMERA_PATH[0].azimuth)).toBeLessThan(45);
    expect(CAMERA_PATH[0].elevation).toBeLessThan(15);
  });

  it('finishes looking down the axis, short of dead end-on', () => {
    const last = CAMERA_PATH[CAMERA_PATH.length - 1];
    expect(last.azimuth).toBeGreaterThan(70);
    // At 90 the assembly collapses to a single disc and the framing maths
    // loses the horizontal it projects onto.
    expect(last.azimuth).toBeLessThan(88);
  });

  it('is already looking down the axis when the parts step off it', () => {
    expect(cameraAt(CAMERA_PATH, ACTS.scatter[0]).azimuth).toBeGreaterThan(60);
  });

  it('holds that view for the whole separation, never turning back broadside', () => {
    for (let p = ACTS.scatter[0]; p <= ACTS.scatter[1]; p += 0.02) {
      expect(cameraAt(CAMERA_PATH, p).azimuth).toBeGreaterThan(60);
    }
  });

  it('keeps the axis compressed while end-on, so it reads as a column', () => {
    // How much of the machine's length lands on the screen's vertical axis.
    const acrossScreen = (pose: { azimuth: number; elevation: number }) => {
      const az = (pose.azimuth * Math.PI) / 180;
      const el = (pose.elevation * Math.PI) / 180;
      const dx = Math.cos(el) * Math.sin(az);
      const dy = Math.sin(el);
      const dz = Math.cos(el) * Math.cos(az);
      return Math.abs((-dy * dx) / Math.hypot(dx, dz));
    };
    for (let p = ACTS.scatter[0]; p <= 1; p += 0.02) {
      expect(acrossScreen(cameraAt(CAMERA_PATH, p))).toBeLessThan(0.42);
    }
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
