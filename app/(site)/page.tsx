import { Agents } from "@/components/home/Agents";
import { Contact } from "@/components/home/Contact";
import { DemoShowcase } from "@/components/home/DemoShowcase";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { Process } from "@/components/home/Process";
import { Services } from "@/components/home/Services";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <Services />
      <DemoShowcase />
      <Agents />
      <Process />
      <Contact />
    </>
  );
}
