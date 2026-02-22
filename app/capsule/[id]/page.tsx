"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContractRead } from "@/lib/contract";
import { fetchMetadataFromIPFS, CapsuleMetadata, FileReference } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL } from "@/lib/qrcode";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Logic-only functions remain strictly identical to preserve functionality
const PUBLIC_GATEWAY = "https://orange-accessible-walrus-501.mypinata.cloud/ipfs";
function extractFileInfoRecursive(input: any): { path?: string; cid?: string; url?: string } {
  if (!input) return {};
  if (typeof input === "string") {
    const s = input.trim();
    if (s.startsWith("http") || s.includes("/ipfs/")) return { url: s };
    if (s.includes("/")) return { path: s };
    if ((s.startsWith("Qm") && s.length > 20) || s.length >= 46) return { cid: s };
    return { path: s };
  }
  if (Array.isArray(input)) {
    for (const el of input) {
      const found = extractFileInfoRecursive(el);
      if (found.path || found.cid || found.url) return found;
    }
    return {};
  }
  const keysPriority = ["url", "path", "filename", "cid", "hash"];
  for (const key of keysPriority) {
    if (input && typeof input === "object" && key in input) {
      const found = extractFileInfoRecursive(input[key]);
      if (found.path || found.cid || found.url) return found;
    }
  }
  return {};
}

function getPublicIpfsUrlFromInfo(fileRef: any, parentCid: string, metadata: CapsuleMetadata): string {
  const info = extractFileInfoRecursive(fileRef);
  if (info.url) return info.url.includes("/ipfs/") ? `${PUBLIC_GATEWAY}/${info.url.split("/ipfs/")[1]}` : info.url;
  const filename = info.path ? info.path.split("/").pop() : "";
  let targetCid = info.cid || "";
  if (!targetCid && metadata.fileReferences && info.path) {
    const match = metadata.fileReferences.find((f: FileReference) => f.path === info.path);
    if (match?.cid) targetCid = match.cid;
  }
  if (!targetCid) targetCid = parentCid;
  return (targetCid && filename) ? `${PUBLIC_GATEWAY}/${targetCid}/${filename}` : (targetCid ? `${PUBLIC_GATEWAY}/${targetCid}` : "#");
}

export default function CapsulePage() {
  const params = useParams();
  const capsuleId = params.id as string;
  const { address, isConnected } = useAccount();
  const [capsule, setCapsule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const id = BigInt(capsuleId);
        const data = await ContractRead.getCapsule(id);
        const metadata = await fetchMetadataFromIPFS(data[0]);
        setCapsule({ id: Number(id), cid: data[0], metadata });
        setQrCodeUrl(await generateQRCodeDataURL(getCapsuleURL(Number(id))));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    if (capsuleId) loadData();
    if (isConnected && address) {
      ContractRead.admins(address).then(setIsAdmin).catch(() => setIsAdmin(false));
    }
  }, [capsuleId, isConnected, address]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-red-600">LOADING_LEAK...</div>;

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-red-600">
      <Header />
      
      <main className="max-w-2xl mx-auto border-x border-zinc-800 min-h-screen">
        {/* --- TOP TWEET / MAIN STORY --- */}
        <section className="p-6 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-zinc-800 flex items-center justify-center font-black text-white shrink-0 shadow-lg">
              S
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-white hover:underline cursor-pointer">Spicy_Intel_Node</span>
                <span className="text-zinc-600 text-sm">@leak_bot • {new Date(capsule?.metadata.createdAt).toLocaleDateString()}</span>
              </div>
              <h1 className="text-2xl font-black text-white leading-tight mb-3">
                {capsule?.metadata.title}
              </h1>
              <p className="text-lg text-zinc-300 mb-4 whitespace-pre-wrap">
                {capsule?.metadata.description}
              </p>
              
              {/* QR "Card" Attachment */}
              {qrCodeUrl && (
                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-black mb-4">
                  <div className="flex items-center p-4 gap-4">
                    <img src={qrCodeUrl} className="w-20 h-20 bg-white p-1 rounded-lg" alt="QR" />
                    <div>
                      <p className="font-bold text-white text-sm uppercase tracking-widest">On-Chain Verification</p>
                      <p className="text-xs text-zinc-500">Scan to verify this record on the immutable ledger. Node ID: {capsule?.id}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-zinc-500 max-w-sm mt-4">
                <span className="flex items-center gap-1 hover:text-red-500 cursor-pointer">💬 12</span>
                <span className="flex items-center gap-1 hover:text-green-500 cursor-pointer">🔄 45</span>
                <span className="flex items-center gap-1 hover:text-red-500 cursor-pointer">❤️ 128</span>
                <span className="flex items-center gap-1 hover:text-blue-500 cursor-pointer">📊 2.4k</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- THE DOCUMENTS AS A THREAD --- */}
        <div className="bg-black">
          <div className="p-4 bg-zinc-900/20 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 border-b border-zinc-800">
            Thread: Attached Evidence ({[...(capsule?.metadata.landAllotmentFiles || []), ...(capsule?.metadata.paymentProofFiles || [])].length})
          </div>

          {[...(capsule?.metadata.landAllotmentFiles || []), ...(capsule?.metadata.paymentProofFiles || [])].map((fileRef, idx) => {
            const info = extractFileInfoRecursive(fileRef);
            const name = info.path?.split("/").pop() || info.url?.split("/").pop() || info.cid || `INTEL_FILE_${idx}`;
            const url = getPublicIpfsUrlFromInfo(fileRef, capsule.cid, capsule.metadata);
            
            return (
              <motion.div 
                initial={{ opacity: 0 }} 
                whileInView={{ opacity: 1 }}
                key={idx} 
                className="p-6 border-b border-zinc-800 flex gap-4 hover:bg-zinc-900/30 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <div className="w-1 h-full bg-zinc-800 rounded-full" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                      {name.endsWith('.pdf') ? '📄' : '🖼️'}
                    </div>
                    <span className="text-[10px] font-mono text-red-600 font-black uppercase">Evidence_Injection_{idx}</span>
                  </div>
                  
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group">
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold text-white truncate">{name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">SOURCE: IPFS_STORAGE_NODE</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => {navigator.clipboard.writeText(url); alert('HASH_COPIED')}}
                        className="bg-zinc-800 hover:bg-zinc-700 text-[9px] font-black px-3 py-2 rounded-lg transition-all uppercase"
                      >
                        Copy
                      </button>
                      <a 
                        href={url} 
                        target="_blank" 
                        className="bg-red-600 hover:bg-white hover:text-black text-white font-black px-4 py-2 rounded-lg text-[9px] transition-all uppercase"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="p-10 text-center">
            <a href={`/admin/update-capsule/${capsule?.id}`} className="text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white border-b border-zinc-800 pb-1">
              [ Edit This Intelligence Node ]
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}