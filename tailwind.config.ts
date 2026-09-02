import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { ink: '#070708', violet: '#7c5cff', success: '#24cf67' } } },
  plugins: [],
};
export default config;
