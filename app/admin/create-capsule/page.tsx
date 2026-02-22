"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CapsuleForm from "@/components/CapsuleForm";

export default function CreateCapsulePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-blue-500/30">
      {/* Optional: Subtle scanning line animation overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />

      <Header />

      {/* Removed max-w-4xl, mx-auto, px-6, and py-16 to go full screen */}
      <main className="w-full min-h-[calc(100vh-64px)] relative z-10">
        <div className="p-8 md:p-12">
          {/* Futuristic Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-blue-400 transition-all mb-6"
          >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">‹</span> 
            Return to Nexus
          </button>

          <div className="relative inline-block">
            <h1 className="text-5xl md:text-6xl font-black mb-4 text-white italic tracking-tighter uppercase">
              Deploy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-600">Intelligence</span>
            </h1>
            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-transparent hidden md:block" />
          </div>

          <p className="text-zinc-400 font-mono text-sm max-w-xl leading-relaxed border-l border-zinc-800 pl-4 mb-12">
            Initialize immutable data transmission. Upload multi-media evidence 
            and legal documentation for permanent blockchain archival.
          </p>
        </div>

        {/* Form stretches to edges */}
        <div className="relative w-full">
            {/* Glow effect slightly adjusted for full width */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-violet-600/10 blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            
            <div className="relative w-full">
                <CapsuleForm />
            </div>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
}