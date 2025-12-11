import { PinnedSection, FrequentSection } from "@/features/home";

export function HomePage() {
  return (
    <div className="flex-1 flex flex-col overflow-auto p-4" role="main">
      <h1 className="text-lg font-semibold mb-4">Главная</h1>
      <div className="space-y-6">
        <PinnedSection />
        <FrequentSection />
      </div>
    </div>
  );
}

export default HomePage;
