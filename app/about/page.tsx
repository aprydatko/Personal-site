import { Container } from '@/app/components/Container';
import { AboutDetails } from '@/app/components/about/AboutDetails';
import { AboutHero } from '@/app/components/about/AboutHero';

export default function AboutPage() {
  return <main id="main-content" tabIndex={-1}><Container><AboutHero /><AboutDetails /></Container></main>;
}
