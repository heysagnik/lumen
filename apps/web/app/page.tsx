import { UploadForm } from "@/components/UploadForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h1 className="text-2xl font-semibold tracking-tight mb-3">Every fact, checked.</h1>
            <p className="text-muted text-[15px] leading-relaxed">
              Drop in a PDF. Lumen pulls out every checkable fact, grounds each one to its exact
              source line, and shows you what agrees, what conflicts, and why — across every
              document you upload.
            </p>
          </div>
          <UploadForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
