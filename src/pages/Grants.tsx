import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GrantsSection from "@/components/GrantsSection";

const Grants = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24">
        <GrantsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Grants;