/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The public form submits resumes directly to FastAPI; no Next.js body proxying,
  // so we don't bump up against Vercel's serverless body limit (DESIGN.md 5.2).
};

export default nextConfig;
