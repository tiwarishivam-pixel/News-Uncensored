"use client";

import { useEffect, useState } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import { useParams } from "next/navigation";

import CapsuleABI from "@/abi/CapsuleRegistry.json";
import {
  fetchMetadataFromIPFS,
  updateCapsuleInIPFS,
  CapsuleMetadata,
  FileReference
} from "@/lib/ipfs";
import Header from "@/components/Header";

/* ---------------- CONFIG ---------------- */
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const ACCEPTED_TYPES = "image/*,.pdf,.doc,.docx";
const PUBLIC_GATEWAY = "https://orange-accessible-walrus-501.mypinata.cloud/ipfs";

interface CapsuleData {
  id: number;
  cid: string;
  metadata: CapsuleMetadata;
}

/* ---------------- ROBUST HELPERS (From Capsule Page) ---------------- */

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

function getPublicIpfsUrlFromInfo(
  fileRef: any,
  parentCid: string,
  metadata: CapsuleMetadata
): string {
  const info = extractFileInfoRecursive(fileRef);
  if (info.url) {
    if (info.url.includes("/ipfs/")) {
      const cidPath = info.url.split("/ipfs/")[1];
      return `${PUBLIC_GATEWAY}/${cidPath}`;
    }
    return info.url;
  }
  const filename = info.path ? info.path.split("/").pop() : "";
  let targetCid = info.cid || "";
  if (!targetCid && metadata.fileReferences && info.path) {
    const match = metadata.fileReferences.find((f: FileReference) => f.path === info.path);
    if (match?.cid) targetCid = match.cid;
  }
  if (!targetCid) targetCid = parentCid;
  if (targetCid && filename) return `${PUBLIC_GATEWAY}/${targetCid}/${filename}`;
  return targetCid ? `${PUBLIC_GATEWAY}/${targetCid}` : "#";
}

const isImageFile = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext || "");
};
const isPdfFile = (name: string) => name.toLowerCase().endsWith(".pdf");

/* ---------------- REUSABLE UPLOAD BOX ---------------- */
function UploadBox({ label, files, setFiles }: { label: string; files: File[]; setFiles: React.Dispatch<React.SetStateAction<File[]>> }) {
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div>
      <p className="font-semibold mb-2 text-gray-700">{label}</p>
      <label className="flex flex-col items-center justify-center w-full h-40 cursor-pointer rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition">
        <p className="text-blue-700 font-semibold">Click to Upload</p>
        <p className="text-xs text-gray-500 mt-1">Files will be appended to blockchain record</p>
        <input type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={addFiles} />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={i} className="flex justify-between items-center rounded-md border px-3 py-2 text-sm bg-white shadow-sm">
              <span className="truncate max-w-[80%]">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-red-500 text-xs font-bold">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function UpdateCapsule() {
  const params = useParams();
  const capsuleId = params.id as string;

  /* ---------- STATE ---------- */
  const [capsule, setCapsule] = useState<CapsuleData | null>(null);
  const [newLandFiles, setNewLandFiles] = useState<File[]>([]);
  const [newPaymentFiles, setNewPaymentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    async function loadCapsule() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CapsuleABI.abi, provider);
        const rawData = await contract.getCapsule(BigInt(capsuleId));
        const cid = rawData[0];
        const metadata = await fetchMetadataFromIPFS(cid);

        setCapsule({ id: Number(capsuleId), cid, metadata });
      } catch (err) {
        console.error(err);
        setError("Failed to load capsule data");
      }
    }
    if (capsuleId) loadCapsule();
  }, [capsuleId]);

  /* ---------------- SUBMIT LOGIC ---------------- */
  const submit = async () => {
    if (newLandFiles.length === 0 && newPaymentFiles.length === 0) {
      alert("Please upload at least one new document");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CapsuleABI.abi, signer);

      // Using the CID from the loaded capsule state
      const newCid = await updateCapsuleInIPFS(capsule!.cid, newLandFiles, newPaymentFiles);
      const tx = await contract.updateCapsule(BigInt(capsuleId), newCid);
      await tx.wait();

      alert("Documents appended successfully");
      window.location.reload(); // Refresh to show new state
    } catch (err: any) {
      setError(err?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text || text === "#") return;
    navigator.clipboard.writeText(text);
    alert("Hash Copied to Clipboard!");
  };

  if (!capsule && !error) return <div className="p-10 text-center">Loading Record...</div>;

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-6 text-left">
          Update Record <span className="text-gray-500">#{capsuleId}</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: INFO */}
          <div className="bg-white p-6 rounded-xl shadow space-y-4 h-fit">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                <input disabled value={capsule?.metadata.title || ""} className="w-full p-3 bg-gray-50 border rounded-md text-gray-600" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                <textarea disabled value={capsule?.metadata.description || ""} rows={4} className="w-full p-3 bg-gray-50 border rounded-md text-gray-600" />
            </div>
            <p className="text-xs text-amber-600 font-medium">🔒 Metadata is immutable. You can only append new documents.</p>
          </div>

          {/* RIGHT PANEL: TABLE & UPLOAD */}
          <div className="space-y-6">
            <div className="bg-white rounded-md shadow-sm border border-gray-200">
              <div className="border-b px-4 py-3 bg-gray-50/50">
                <h3 className="font-semibold text-brandNavy text-sm text-left">Existing On-Chain Documents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Document Name</th>
                      <th className="px-4 py-3 text-left font-bold">Type</th>
                      <th className="px-4 py-3 text-left font-bold">Copy Hash</th>
                      <th className="px-4 py-3 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...(capsule?.metadata.landAllotmentFiles || []), ...(capsule?.metadata.paymentProofFiles || [])].length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No documents found in this record.</td></tr>
                    ) : (
                      [...(capsule?.metadata.landAllotmentFiles || []), ...(capsule?.metadata.paymentProofFiles || [])].map((fileRef, i) => {
                        const info = extractFileInfoRecursive(fileRef);
                        const name = info.path?.split("/").pop() || info.url?.split("/").pop() || info.cid || `Document ${i + 1}`;
                        const url = getPublicIpfsUrlFromInfo(fileRef, capsule!.cid, capsule!.metadata);
                        const isPDF = isPdfFile(name);
                        const isIMG = isImageFile(name);

                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 font-medium text-gray-900 text-left align-middle truncate max-w-[200px]">{name}</td>
                            <td className="px-4 py-4 text-left align-middle">
                              <span className={`px-2 py-1 text-[10px] font-bold border rounded uppercase ${isPDF ? "bg-red-50 text-red-600 border-red-200" : isIMG ? "bg-green-50 text-green-600 border-green-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                                {isPDF ? "PDF" : isIMG ? "IMG" : "DOC"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-left align-middle">
                              <button onClick={() => handleCopy(url)} className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline decoration-dotted">Copy Link</button>
                            </td>
                            <td className="px-4 py-4 text-right align-middle">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 border border-blue-200 text-blue-600 rounded bg-white hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <span className="text-xs">⬇</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* UPLOAD SECTION */}
            <div className="bg-white p-6 rounded-xl shadow border border-blue-100 space-y-6">
              <UploadBox label="Land Allotment Documents" files={newLandFiles} setFiles={setNewLandFiles} />
              <UploadBox label="Payment Proofs" files={newPaymentFiles} setFiles={setNewPaymentFiles} />

              <button
                onClick={submit}
                disabled={loading || !capsule}
                className="w-full py-4 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-950 transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? "Updating Blockchain Record..." : "Confirm & Append Documents"}
              </button>
              {error && <p className="text-red-600 text-sm font-semibold text-center mt-2">{error}</p>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}