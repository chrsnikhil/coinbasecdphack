import { baseSepolia } from 'wagmi/chains';

// Use the correct deployed contract address
export const FREELANCE_PLATFORM_ADDRESS = "0xeCCf2782bB3685E9FCe4bB9d94Fd57d2F24Ad3e4" as const;

export const FREELANCE_PLATFORM_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "worker", "type": "address" }
    ],
    "name": "TaskAccepted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "worker", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "submittedFileCID", "type": "string" }
    ],
    "name": "TaskCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "bounty", "type": "uint256" }
    ],
    "name": "TaskCreated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" }
    ],
    "name": "acceptTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "uint256", "name": "_bounty", "type": "uint256" },
      { "internalType": "string[]", "name": "_requiredFileTypes", "type": "string[]" }
    ],
    "name": "createTask",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" }
    ],
    "name": "getTask",
    "outputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "uint256", "name": "bounty", "type": "uint256" },
      { "internalType": "address", "name": "worker", "type": "address" },
      { "internalType": "bool", "name": "isCompleted", "type": "bool" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "string[]", "name": "requiredFileTypes", "type": "string[]" },
      { "internalType": "string", "name": "submittedFileCID", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" },
      { "internalType": "string", "name": "_submittedFileCID", "type": "string" }
    ],
    "name": "submitTaskCompletion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "taskCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tasks",
    "outputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "bounty",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "worker",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isCompleted",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "string[]",
        "name": "requiredFileTypes",
        "type": "string[]"
      },
      {
        "internalType": "string",
        "name": "submittedFileCID",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const contractConfig = {
  address: FREELANCE_PLATFORM_ADDRESS,
  abi: FREELANCE_PLATFORM_ABI,
  chainId: baseSepolia.id,
} as const; 