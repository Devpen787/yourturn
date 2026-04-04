import { ExperiencePillars } from "@/components/home/ExperiencePillars";
import { HomeHero } from "@/components/home/HomeHero";
import { StartFlowCta } from "@/components/home/StartFlowCta";

export default function Home() {
  return (
    <div className="space-y-12 pb-10">
      <HomeHero />
      <ExperiencePillars />
      <StartFlowCta />
    </div>
  );
}
