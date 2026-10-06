import { describe, expect, it } from 'vitest';
import { thumbnailMap, withThumbnail } from './thumbnails';
import type { Project } from './types';

describe('thumbnailMap', () => {
  it('keys the bundled url by the folder name', () => {
    const map = thumbnailMap({ '../../thumbnails/BridgeOrBust/shot.png': '/assets/shot-a1b2c3.png' }, '/');
    expect(map).toEqual({ BridgeOrBust: '/assets/shot-a1b2c3.png' });
  });

  it('takes the alphabetically first image when a folder holds several', () => {
    const map = thumbnailMap(
      {
        '../../thumbnails/quicklink/zebra.png': '/assets/zebra-222.png',
        '../../thumbnails/quicklink/apple.jpg': '/assets/apple-111.jpg',
      },
      '/',
    );
    expect(map).toEqual({ quicklink: '/assets/apple-111.jpg' });
  });

  it('strips the base so the path survives withBase on a subpath deploy', () => {
    const map = thumbnailMap({ '../../thumbnails/ECSEGAMES/a.webp': '/portfolio/assets/a-333.webp' }, '/portfolio/');
    expect(map).toEqual({ ECSEGAMES: '/assets/a-333.webp' });
  });

  it('ignores files sitting directly in the thumbnails folder', () => {
    expect(thumbnailMap({ '../../thumbnails/README.md': '/assets/README-444.md' }, '/')).toEqual({});
  });
});

describe('withThumbnail', () => {
  const project = { id: 'quicklink', image: null } as Project;

  it('fills in the image for a project with a dropped file', () => {
    expect(withThumbnail(project, { quicklink: '/assets/a-111.png' }).image).toBe('/assets/a-111.png');
  });

  it('wins over an image set in projects.yml', () => {
    const withUrl = { ...project, image: 'https://example.com/readme.gif' };
    expect(withThumbnail(withUrl, { quicklink: '/assets/a-111.png' }).image).toBe('/assets/a-111.png');
  });

  it('leaves a project with no dropped file untouched', () => {
    const withUrl = { ...project, image: 'https://example.com/readme.gif' };
    expect(withThumbnail(withUrl, {})).toBe(withUrl);
  });
});
