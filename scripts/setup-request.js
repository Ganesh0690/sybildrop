const { ethers } = require("hardhat");

async function main() {
  const UNIVERSAL_VERIFIER = "0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c";
  const VALIDATOR_SIG_V2 = "0x59B347f0D3dd4B98cc2E056Ee6C53ABF14F8581b";

  const REQUEST_ID = 1;
  const SCHEMA_HASH = "74977327600848231385663280181476307657";
  const SCHEMA_URL = "ipfs://QmP8NvMAqz3XAGEU2vQ8bJ7tLzAc4yb9EB6VUQuFJcGqHR";
  const CREDENTIAL_TYPE = "ProofOfHumanity";
  const FIELD_NAME = "isHuman";

  const verifier = await ethers.getContractAt(
    [
      "function setZKPRequest(uint64 requestId, tuple(string metadata, tuple(uint256 schema, uint256 claimPathKey, uint256 operator, uint256 slotIndex, uint256[] value, uint256 queryHash, uint256[] allowedIssuers, string[] circuitIds, bool skipClaimRevocationCheck, uint256 groupID) query, address validator, bytes data) request) external"
    ],
    UNIVERSAL_VERIFIER
  );

  const query = {
    schema: SCHEMA_HASH,
    claimPathKey: ethers.solidityPackedKeccak256(["string"], [FIELD_NAME]),
    operator: 1,
    slotIndex: 0,
    value: [1, ...new Array(63).fill(0)],
    queryHash: 0,
    allowedIssuers: [],
    circuitIds: ["credentialAtomicQuerySigV2OnChain"],
    skipClaimRevocationCheck: false,
    groupID: 0,
  };

  const request = {
    metadata: `${CREDENTIAL_TYPE}-${FIELD_NAME}`,
    query: query,
    validator: VALIDATOR_SIG_V2,
    data: "0x",
  };

  const tx = await verifier.setZKPRequest(REQUEST_ID, request);
  await tx.wait();

  console.log("ZKP Request set successfully");
  console.log("Request ID:", REQUEST_ID);
  console.log("Credential Type:", CREDENTIAL_TYPE);
  console.log("Field:", FIELD_NAME);
  console.log("Tx hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
