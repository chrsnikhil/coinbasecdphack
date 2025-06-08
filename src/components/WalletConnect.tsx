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

export function WalletConnect() {
  return (
    <Wallet>
      <ConnectWallet withWalletAggregator={true} />
      <WalletDropdown>
        <WalletAdvancedWalletActions />
        <WalletAdvancedAddressDetails />
        <WalletAdvancedTokenHoldings />
        <WalletAdvancedTransactionActions />
      </WalletDropdown>
    </Wallet>
  );
} 