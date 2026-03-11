const { ethers } = require("hardhat");

async function main() {
  const UNIVERSAL_VERIFIER = "0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c";
  const TOKEN_NAME = "SybilDrop";
  const TOKEN_SYMBOL = "SDROP";
  const AIRDROP_AMOUNT = ethers.parseEther("100");
  const AIRDROP_DURATION = 30 * 24 * 60 * 60;
  const MAX_CLAIMABLE = 10000;

  const ZKAirdrop = await ethers.getContractFactory("ZKAirdrop");
  const airdrop = await ZKAirdrop.deploy(
    UNIVERSAL_VERIFIER,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    AIRDROP_AMOUNT,
    AIRDROP_DURATION,
    MAX_CLAIMABLE
  );

  await airdrop.waitForDeployment();
  const address = await airdrop.getAddress();

  console.log("ZKAirdrop deployed to:", address);
  console.log("Token Name:", TOKEN_NAME);
  console.log("Token Symbol:", TOKEN_SYMBOL);
  console.log("Airdrop Amount per user:", ethers.formatEther(AIRDROP_AMOUNT), TOKEN_SYMBOL);
  console.log("Max Claimable:", MAX_CLAIMABLE);
  console.log("UniversalVerifier:", UNIVERSAL_VERIFIER);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
