# Thumbnails

One folder per repository, named exactly as the repository is on GitHub.

Drop **one image** into a folder and it becomes that project's thumbnail on the
landing page, and the image at the top of its own page. Any filename, any of
`.png .jpg .jpeg .webp .avif .gif .svg`. Nothing else to edit — no path to add
to `content/projects.yml`.

A project with no image here keeps its drafted plate, the generated technical
drawing in `src/ui/Thumbnail.tsx`.

Notes:

- Landing-page cards are 340×190, so roughly 3:2 and at least 680px wide looks
  right on a retina screen. Images are not resized for you.
- An image here wins over an `image:` line in `content/projects.yml`.
- If a folder somehow holds two images, the alphabetically first is used.
- `pnpm test` fails if a folder here is not named after a real repo, so a typo
  cannot silently swallow a thumbnail.
