'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from "@/components/ui/button";
import { useState } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  console.log('Available connectors:', connectors);

  if (isConnected) {
    return (
      <Button
        onClick={() => disconnect()}
        className="bg-white text-black hover:bg-zinc-200"
      >
        {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setShowWalletOptions(true)}
        className="bg-white text-black hover:bg-zinc-200"
      >
        Connect Wallet
      </Button>
      {showWalletOptions && (
        <div className="absolute right-0 mt-2 w-72 bg-black/90 backdrop-blur-sm rounded-lg shadow-lg py-2 z-50 border border-white/10">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-base font-semibold text-white">Connect Wallet</h3>
            <p className="text-sm text-zinc-400 mt-1">Choose your preferred wallet</p>
          </div>
          <div className="py-2">
            {connectors.map((connector) => {
              console.log('Rendering connector:', { id: connector.id, name: connector.name, ready: connector.ready });
              return (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setShowWalletOptions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center space-x-3 transition-colors"
                >
                  <div>
                    <p className="font-medium text-white">{connector.name}</p>
                    <p className="text-sm text-zinc-400">Connect with {connector.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 