/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a verification build (NEXT_DIST_DIR=.next-check) run without overwriting the dev server's .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
