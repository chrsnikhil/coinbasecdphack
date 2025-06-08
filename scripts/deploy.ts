import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
  const freelancePlatform = await FreelancePlatform.deploy();

  await freelancePlatform.waitForDeployment();

  console.log("FreelancePlatform deployed to:", await freelancePlatform.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 