import { copyFile, mkdir } from 'node:fs/promises';

const target = new URL('../site/assets/vendor/', import.meta.url);
await mkdir(target, { recursive: true });
for (const file of ['gsap.min.js', 'ScrollTrigger.min.js']) {
  await copyFile(new URL(`../node_modules/gsap/dist/${file}`, import.meta.url), new URL(file, target));
}
await copyFile(new URL('../node_modules/gsap/README.md', import.meta.url), new URL('GSAP-README.md', target));
console.log('Self-hosted GSAP assets updated.');
