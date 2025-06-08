async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
  const freelancePlatform = await FreelancePlatform.deploy();

  await freelancePlatform.waitForDeployment();

  console.log("FreelancePlatform deployed to:", await freelancePlatform.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => (process.exitCode = 0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }); 