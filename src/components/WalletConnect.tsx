'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ChevronDown } from 'lucide-react';

const MetaMaskSVG = (
  <svg width="24" height="24" viewBox="0 0 212 189" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <polygon fill="#E2761B" points="184.1,1.6 116.6,52.6 128.9,27.2" />
      <polygon fill="#E4761B" points="27.7,1.6 83.1,53.1 72.2,27.2" />
      <polygon fill="#D7C1B3" points="169.6,137.7 146.2,156.2 180.7,165.5 190.1,138.7" />
      <polygon fill="#D7C1B3" points="21.7,138.7 31.1,165.5 65.6,156.2 42.2,137.7" />
      <polygon fill="#233447" points="83.7,109.2 77.1,119.2 115.1,120.8 108.7,109.1" />
      <polygon fill="#233447" points="128.3,109.1 121.9,120.8 159.9,119.2 153.3,109.2" />
      <polygon fill="#CD6116" points="65.6,156.2 83.1,146.7 68.7,135.6" />
      <polygon fill="#CD6116" points="146.2,156.2 143.1,135.6 128.9,146.7" />
      <polygon fill="#E4751F" points="83.1,146.7 65.6,156.2 68.2,165.5 95.1,164.6 95.1,153.2" />
      <polygon fill="#E4751F" points="128.9,146.7 128.9,153.2 128.9,164.6 155.8,165.5 158.4,156.2" />
      <polygon fill="#F6851B" points="128.9,153.2 128.9,146.7 128.9,146.7 128.9,153.2 128.9,164.6 128.9,164.6 128.9,153.2" />
      <polygon fill="#F6851B" points="95.1,153.2 95.1,146.7 95.1,146.7 95.1,153.2 95.1,164.6 95.1,164.6 95.1,153.2" />
      <polygon fill="#C0AD9E" points="95.1,164.6 68.2,165.5 70.2,172.2 95.1,172.2 95.1,164.6" />
      <polygon fill="#C0AD9E" points="128.9,164.6 128.9,172.2 153.8,172.2 155.8,165.5 128.9,164.6" />
      <polygon fill="#161616" points="128.9,172.2 128.9,164.6 128.9,164.6 128.9,172.2 153.8,172.2 153.8,172.2 128.9,172.2" />
      <polygon fill="#161616" points="95.1,164.6 95.1,172.2 70.2,172.2 70.2,172.2 95.1,172.2 95.1,164.6" />
      <polygon fill="#763D16" points="153.8,120.8 121.9,120.8 128.9,135.6 143.1,135.6 153.8,120.8" />
      <polygon fill="#763D16" points="77.1,120.8 45.2,120.8 56,135.6 70.2,135.6 77.1,120.8" />
      <polygon fill="#F6851B" points="121.9,120.8 128.9,109.1 108.7,109.1 115.1,120.8 121.9,120.8" />
      <polygon fill="#F6851B" points="77.1,120.8 83.7,109.2 108.7,109.1 108.7,109.1 77.1,120.8" />
    </g>
  </svg>
);

const CoinbaseSVG = (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#0052FF"/>
    <path d="M16 6C10.48 6 6 10.48 6 16C6 21.52 10.48 26 16 26C21.52 26 26 21.52 26 16C26 10.48 21.52 6 16 6ZM16 24C11.58 24 8 20.42 8 16C8 11.58 11.58 8 16 8C20.42 8 24 11.58 24 16C24 20.42 20.42 24 16 24Z" fill="white"/>
    <path d="M16 10C12.69 10 10 12.69 10 16C10 19.31 12.69 22 16 22C19.31 22 22 19.31 22 16C22 12.69 19.31 10 16 10ZM16 20C13.79 20 12 18.21 12 16C12 13.79 13.79 12 16 12C18.21 12 20 13.79 20 16C20 18.21 18.21 20 16 20Z" fill="white"/>
  </svg>
);

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-base text-white/80 font-light">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <Button
          size="lg"
          onClick={() => disconnect()}
          className="bg-white/15 backdrop-blur-2xl text-white hover:bg-white/25 text-lg px-6 py-3 border border-white/40 rounded-2xl font-light"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        size="lg"
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-white/15 backdrop-blur-2xl text-white hover:bg-white/25 text-lg px-6 py-3 border border-white/40 rounded-2xl font-light"
      >
        Connect Wallet
        <ChevronDown className="ml-3 h-5 w-5 text-white/70" />
      </Button>
      
      {showDropdown && (
        <div 
          className="absolute right-0 mt-4 w-60 rounded-3xl shadow-lg bg-white/10 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 z-50"
        >
          <div className="p-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => {
                  connect({ connector });
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-3 text-left text-base text-white/90 hover:bg-white/10 flex items-center gap-3 rounded-xl transition-all duration-300 font-light"
              >
                {connector.id === 'metaMaskSDK' && MetaMaskSVG}
                {connector.id === 'coinbaseWalletSDK' && CoinbaseSVG}
                {connector.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}