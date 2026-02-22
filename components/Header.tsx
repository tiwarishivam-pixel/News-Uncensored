"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full border-b border-zinc-800 bg-black/80 backdrop-blur-xl sticky top-0 z-50 overflow-hidden">
      {/* Decorative scanning line animation */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-red-600 shadow-[0_0_10px_#dc2626] opacity-50 animate-pulse" />
      
      <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
        
        {/* Spicy Theme Title instead of Logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="group flex flex-col">
            <span className="text-xl font-black italic tracking-tighter text-white uppercase leading-none group-hover:text-red-600 transition-colors">
              SPICY<span className="text-red-600 group-hover:text-white transition-colors">INTEL</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                System: Live_Feed
              </span>
            </div>
          </Link>
        </div>

        {/* Action Area */}
        <div className="flex items-center gap-6">
          {/* Subtle Navigation or Status Links */}
          <nav className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            <Link href="/" className="hover:text-red-500 transition-colors">Archives</Link>
            <span className="text-zinc-800">|</span>
            <Link href="/" className="hover:text-red-500 transition-colors">Nodes</Link>
          </nav>

          {/* Wallet Connect - Wrapped for theme consistency */}
          <div className="scale-90 md:scale-100 origin-right">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="bg-red-600 hover:bg-white hover:text-black text-white px-6 py-2 rounded-full font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                          >
                            Access Vault
                          </button>
                        );
                      }
                      return (
                        <div className="flex gap-3">
                          <button
                            onClick={openChainModal}
                            className="hidden lg:flex items-center bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-full font-mono text-[10px] hover:border-red-600 transition-colors"
                          >
                            {chain.name}
                          </button>
                          <button
                            onClick={openAccountModal}
                            className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-full font-mono text-xs hover:border-red-600 transition-colors shadow-lg"
                          >
                            {account.displayName}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}