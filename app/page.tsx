"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

import Header from "../components/Header";
import Footer from "../components/Footer";
import CapsuleTable from "@/components/CapsuleTable";
import { ContractRead, CONTRACT_ADDRESS, ABI } from "@/lib/contract";
import { fetchMetadataFromIPFS } from "@/lib/ipfs";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [scanEffect, setScanEffect] = useState(0);

  useEffect(() => {
    async function checkAdmin() {
      if (!isConnected || !address) {
        setCheckingAdmin(false);
        return;
      }
      try {
        const isAdmin = await ContractRead.admins(address);
        if (isAdmin) router.push("/admin");
      } catch (err) {
        console.error("Access check failed:", err);
      } finally {
        setCheckingAdmin(false);
      }
    }
    checkAdmin();
  }, [isConnected, address, router]);

  async function loadCapsules() {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const nextId = await contract.nextId();
      const total = Number(nextId);

      const list = await Promise.all(
        Array.from({ length: total }).map(async (_, id) => {
          try {
            const capsule = await contract.capsules(id);
            const metadata = await fetchMetadataFromIPFS(capsule.cid);
            return {
              id,
              cid: capsule.cid,
              meta: {
                title: metadata.title || `CLASSIFIED #${id}`,
                description: metadata.description || "ENCRYPTED CONTENT",
              },
              createdAt: metadata.createdAt,
            };
          } catch (err) {
            return { id, meta: { title: `REDACTED #${id}`, description: "DECRYPTION ERROR" } };
          }
        })
      );
      setCapsules(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCapsules();
    const interval = setInterval(() => setScanEffect((s) => (s + 1) % 100), 50);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-red-600 font-mono">
        <div className="text-6xl font-black italic tracking-tighter mb-2 animate-pulse">SECRET_NEWS</div>
        <p className="tracking-[0.5em] text-xs uppercase opacity-50">Checking Security Clearance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white overflow-x-hidden">
      {/* 1. Global Styles Fix */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}} />

      <Header />

      <section className="relative h-screen flex flex-col items-center justify-center px-4">
        <div className="absolute w-[500px] h-[500px] border border-red-900/30 rounded-full animate-ping opacity-20" />
        <div className="relative z-10 text-center space-y-6">
          <div className="inline-block px-3 py-1 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-4">
            Live Decentralized Intel
          </div>
          <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter uppercase leading-none">
            Spicy <span className="text-red-600">Truth.</span><br />
            No <span className="line-through decoration-red-600 decoration-8">Censorship.</span>
          </h1>
          <div className="pt-10">
            <button 
              onClick={() => window.scrollTo({ top: 900, behavior: 'smooth'})}
              className="bg-white text-black px-10 py-4 rounded-full font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all transform hover:scale-110"
            >
              Enter The Underground
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4 border-b border-zinc-800 pb-10">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">
            Classified <span className="text-red-600">Feed</span>
          </h2>
        </div>

        {/* {loading ? (
          <div className="flex flex-col justify-center items-center py-40">
            <p className="text-red-600 font-mono text-[10px] animate-pulse uppercase tracking-[0.5em]">Syncing Blockchain Records...</p>
          </div>
        ) : (
          <div className="group/table relative">
             <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl">
               <CapsuleTable capsules={capsules} />
             </div>
          </div>
        )} */}
      </main>

      {/* --- SCROLLING TICKER --- */}
      <div className="bg-red-600 py-3 overflow-hidden whitespace-nowrap border-y border-black uppercase italic font-black text-black">
        <div className="flex animate-marquee gap-10 whitespace-nowrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i}>
              Breaking: New Land Allotment Recorded on Chain ⚡ ID #{Math.floor(Math.random() * 100)} Leaked ⚡ Stay Spicy ⚡ No Middlemen ⚡
            </span>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}