"use client";

import { useState } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import { useAccount } from "wagmi";

import CapsuleABI from "@/abi/CapsuleRegistry.json";
import { uploadFolderToIPFS } from "@/lib/ipfs";
import { generateQRCodeDataURL, getCapsuleURL } from "@/lib/qrcode";

/* ---------------- CONFIG ---------------- */
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const ACCEPTED_TYPES = "image/*,.pdf,.doc,.docx";

/* ---------------- SPICY UPLOAD BOX ---------------- */
function UploadBox({
  label,
  files,
  setFiles,
}: {
  label: string;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}) {
  const attachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="group">
      <p className="text-xs uppercase tracking-widest font-bold mb-3 text-blue-400 group-hover:text-cyan-400 transition-colors">
        {label}
      </p>

      <label className="relative flex flex-col items-center justify-center w-full h-32 cursor-pointer rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all duration-300 group">
        <div className="flex flex-col items-center">
          <div className="p-3 rounded-full bg-zinc-800 mb-2 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">Add Evidence</p>
        </div>
        <input type="file" multiple accept={ACCEPTED_TYPES} onChange={attachFiles} className="hidden" />
      </label>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-full text-xs text-zinc-300 animate-in fade-in slide-in-from-bottom-1">
              <span className="max-w-[100px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300 font-bold">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function CreateCapsule() {
  const { isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Corporate"); // Linked to state for better react flow

  const [landFiles, setLandFiles] = useState<File[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [capsuleId, setCapsuleId] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  /* ---------------- LOGIC (STRICTLY UNCHANGED) ---------------- */
  const submit = async () => {
    if (!isConnected) return alert("Connect wallet first");
    if (!title.trim()) return alert("Record name is required");
    if (landFiles.length === 0 && paymentFiles.length === 0)
      return alert("Upload at least one document");

    setLoading(true);
    setError(null);

    try {
      const cid = await uploadFolderToIPFS({
        title,
        description: desc,
        landFiles,
        paymentProofs: paymentFiles,
      });

      if (!window.ethereum) throw new Error("Wallet not found");

      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CapsuleABI.abi, signer);
      
      const tx = await contract.createCapsule(cid);
      const receipt = await tx.wait();

      let createdId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "CapsuleCreated") {
            createdId = Number(parsed.args.id);
            break;
          }
        } catch {}
      }

      if (createdId === null) throw new Error("CapsuleCreated event missing");

      setCapsuleId(createdId);
      const url = getCapsuleURL(createdId);
      const qr = await generateQRCodeDataURL(url);
      setQrUrl(qr);

      alert("Record created successfully");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SPICY UI ---------------- */
  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto py-12 px-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
              Nexus Record
            </h1>
            <p className="text-zinc-500 text-sm font-mono mt-1">SECURE BLOCKCHAIN ARCHIVE // VER_2.0</p>
          </div>
          <div className={`px-4 py-1 rounded-full border text-xs font-mono ${isConnected ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'}`}>
            {isConnected ? "SYSTEM_ONLINE" : "DISCONNECTED"}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl backdrop-blur-sm">
              
              {/* Identity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Entry Title</label>
                  <input
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-lg p-4 text-white outline-none"
                    placeholder="e.g. OPERATION_NAGPUR_X"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Category Tag</label>
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg p-4 text-white outline-none appearance-none cursor-pointer"
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option className="bg-zinc-900">Corporate</option>
                    <option className="bg-zinc-900">Crime</option>
                    <option className="bg-zinc-900">Land Allotment</option>
                  </select>
                </div>
              </div>

              <div className="mb-8">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Data Description</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg p-4 text-white outline-none min-h-[120px] resize-none"
                  placeholder="Detailed classification of the record..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UploadBox label="Primary Assets" files={landFiles} setFiles={setLandFiles} />
                <UploadBox label="Verification" files={paymentFiles} setFiles={setPaymentFiles} />
              </div>

              {/* Action */}
              <button
                onClick={submit}
                disabled={loading}
                className="w-full mt-10 py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <><span className="animate-spin text-xl">◌</span> PROCESSING...</>
                ) : (
                  "Finalize Record"
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs font-mono">
                  ERROR: {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Status/Result */}
          <div className="lg:col-span-5">
            <div className="sticky top-12">
              {!qrUrl ? (
                <div className="border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center opacity-40">
                  <div className="w-20 h-20 border-2 border-zinc-700 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl italic">?</span>
                  </div>
                  <p className="text-zinc-500 font-mono text-xs uppercase tracking-tighter">Awaiting Submission</p>
                </div>
              ) : (
                <div className="bg-blue-600/10 border border-blue-500/50 p-8 rounded-2xl animate-in zoom-in duration-500">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-black uppercase italic text-blue-400 tracking-tighter">Record Validated</h3>
                    <span className="px-2 py-1 bg-blue-500 text-black text-[10px] font-bold rounded">ID: {capsuleId}</span>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    <img src={qrUrl} className="w-48 h-48" alt="Access QR" />
                  </div>

                  <div className="space-y-4">
                    <div className="h-px bg-blue-500/20 w-full" />
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      This record has been permanently etched into the ledger. Scan the code to retrieve IPFS manifest.
                    </p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-blue-400 hover:text-white text-[10px] font-bold uppercase tracking-widest underline underline-offset-4"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}