'use client';

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletAdvancedAddressDetails,
  WalletAdvancedTokenHoldings,
  WalletAdvancedTransactionActions,
  WalletAdvancedWalletActions,
} from '@coinbase/onchainkit/wallet';
import { useConnect } from 'wagmi';
import { useState } from 'react';

export function WalletConnect() {
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const { connect, connectors } = useConnect();

  return (
    <div className="relative">
      {!showWalletOptions ? (
        <button
          onClick={() => setShowWalletOptions(true)}
          className="bg-[#0052FF] text-white px-6 py-2 rounded-full hover:bg-[#0043CC] transition-colors font-medium shadow-lg"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Connect Wallet</h3>
            <p className="text-sm text-gray-500 mt-1">Choose your preferred wallet</p>
          </div>
          <div className="py-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector });
                  setShowWalletOptions(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
              >
                {connector.name === 'Coinbase Wallet' ? (
                  <img
                    src="https://www.coinbase.com/assets/press/coinbase-icon.png"
                    alt="Coinbase Wallet"
                    className="w-8 h-8"
                  />
                ) : (
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                    alt="MetaMask"
                    className="w-8 h-8"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{connector.name}</p>
                  <p className="text-sm text-gray-500">Connect with {connector.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 