'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button className="bg-white text-black hover:bg-gray-100">
        Connect Wallet
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <Button
          onClick={() => disconnect()}
          className="bg-white text-black hover:bg-gray-100"
        >
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="bg-white text-black hover:bg-gray-100"
        >
          Connect {connector.name}
        </Button>
      ))}
    </div>
  );
} 