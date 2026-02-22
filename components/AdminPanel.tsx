"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./Header";
import CONTRACT_ABI_JSON from "@/abi/CapsuleRegistry.json";
import { fetchMetadataFromIPFS } from "@/lib/ipfs";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_ABI = Array.isArray(CONTRACT_ABI_JSON)
  ? CONTRACT_ABI_JSON
  : CONTRACT_ABI_JSON.abi || CONTRACT_ABI_JSON;

export default function AdminPanel() {
  const router = useRouter();
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCapsules() {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
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
                title: metadata.title || `INTEL_CORE_${id}`,
                description: metadata.description || "NO_DESCRIPTION_LEAKED",
              },
              landAllotmentFiles: metadata.landAllotmentFiles || [],
              paymentProofFiles: metadata.paymentProofFiles || [],
              createdAt: metadata.createdAt || "SEC_TIMESTAMP_00",
            };
          } catch (err) {
            return {
              id,
              meta: { title: `REDACTED_${id}`, description: "ENCRYPTED_DATA" },
              landAllotmentFiles: [],
              paymentProofFiles: [],
              createdAt: "UNKNOWN",
            };
          }
        })
      );
      setCapsules(list.reverse()); // Latest leaks first
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCapsules();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex flex-col font-mono selection:bg-red-600 selection:text-white">
      <Header />

      <main className="max-w-7xl mx-auto w-full px-6 py-12">
        {/* Admin Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-l-4 border-red-600 pl-6">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
              Command <span className="text-red-600">Center</span>
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.3em] mt-2">
              Managing Immutable Record Injections
            </p>
          </div>

          <button
            onClick={() => router.push("/admin/create-capsule")}
            className="group relative inline-flex items-center gap-2 bg-red-600 text-white font-black uppercase text-xs px-8 py-4 rounded-full transition-all hover:bg-white hover:text-black shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            <span className="text-lg leading-none">+</span> New Injection
          </button>
        </div>

        {/* Table Container */}
        <div className="relative group">
          {/* Decorative Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/20 to-zinc-800/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
          
          <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Node_ID</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Record_Header</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Timestamp</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Attachments</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Operations</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-900">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-red-600 text-[10px] uppercase tracking-[0.4em] animate-pulse">Decrypting Ledger...</p>
                      </div>
                    </td>
                  </tr>
                ) : capsules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-zinc-600 italic">No intelligence found in current sector.</td>
                  </tr>
                ) : (
                  capsules.map((c) => (
                    <tr key={c.id} className="hover:bg-red-600/[0.02] transition-colors group/row">
                      <td className="px-6 py-5">
                        <span className="text-red-600 font-black">#{c.id}</span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="font-bold text-zinc-100 text-sm group-hover/row:text-red-500 transition-colors uppercase">
                          {c.meta?.title}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1 line-clamp-1 max-w-xs">
                          {c.meta?.description}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-zinc-500 text-xs font-mono">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-[10px] text-zinc-400">
                          <span className="w-1 h-1 rounded-full bg-red-600"></span>
                          {(c.landAllotmentFiles?.length || 0) + (c.paymentProofFiles?.length || 0)} Files
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => router.push(`/admin/update-capsule/${c.id}`)}
                            className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 hover:text-red-600 transition-all"
                            title="Edit Intel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            onClick={() => router.push(`/capsule/${c.id}`)}
                            className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-white hover:text-white transition-all"
                            title="View Public Link"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}