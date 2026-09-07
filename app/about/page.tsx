import { AboutDetails } from '@/app/components/about/AboutDetails';
import { AboutHero } from '@/app/components/about/AboutHero';
import { Container } from '@/app/components/layout/Container';

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Container>
        <AboutHero />
        <AboutDetails />
      </Container>
    </main>
  );
}
