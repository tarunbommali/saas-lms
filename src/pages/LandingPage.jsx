/* eslint-disable no-unused-vars */
import Hero from "../components/features/LandingPage/Hero/Hero";
import About from "../components/features/LandingPage/About/About";
import Contact from "../components/features/LandingPage/Contact/Contact";
import Skills from "../components/features/LandingPage/Skills/Skills";
import Faq from "../components/features/LandingPage/Faq/FAQSection.jsx";
import JoinCommunity from "../components/features/LandingPage/JoinCommunity/JoinCommunity";
import Testimonial from "../components/features/LandingPage/Testimonial/Testimonial";
import { useRealtime } from "../contexts/RealtimeContext";
import FeaturedCourses from "../components/features/LandingPage/FeaturedCourses/FeaturedCourses";

const LandingPage = () => {
  const { courses } = useRealtime();

  const featuredCourses = Array.isArray(courses)
    ? courses.filter(
      (course) => course?.isFeatured === true || course?.featured === true
    )
    : [];

  return (
    <main className="min-h-screen bg-app text-high">
      <Hero />
      <About />
      <FeaturedCourses courses={featuredCourses} />
      <Skills />
      <Testimonial />
      <Faq />
      <JoinCommunity />
      <Contact />
    </main>
  );
};

export default LandingPage;
