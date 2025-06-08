const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");

dotenv.config();

const config = {
  solidity: "0.8.20",
  paths: {
    sources: "./src/contracts",
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://chain-proxy.wallet.coinbase.com?targetName=base-sepolia",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
  },
};

module.exports = config;
