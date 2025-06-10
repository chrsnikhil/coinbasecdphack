import { baseSepolia } from 'viem/chains';

export const taskContract = {
  address: '0xeCCf2782bB3685E9FCe4bB9d94Fd57d2F24Ad3e4' as `0x${string}`,
  abi: [
    {
      inputs: [
        { name: 'taskId', type: 'uint256' },
        { name: 'submission', type: 'string' }
      ],
      name: 'submitTaskCompletion',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ],
  chainId: baseSepolia.id
}; 