import { Logo } from "@/components/Logo";
import { UploadForm } from "@/components/UploadForm";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="relative flex-1 flex items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size={40} className="inline-flex mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Lumen</h1>
          <p className="text-muted text-[15px] leading-relaxed">
            Drop in a PDF. Lumen pulls out every checkable fact, grounds each one to its exact
            source line, and shows you what agrees, what conflicts, and why — across every
            document you upload.
          </p>
        </div>
        <UploadForm />
      </div>
      <div className="absolute bottom-4 inset-x-0">
        <Footer />
      </div>
    </main>
  );
}
