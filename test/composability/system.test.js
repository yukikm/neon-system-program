const { network, ethers } = require("hardhat");
const web3 = require("@solana/web3.js");
const {
  getAccount,
  TOKEN_PROGRAM_ID,
  ACCOUNT_SIZE,
} = require("@solana/spl-token");
const { deployContract, airdropSOL } = require("./utils.js");
const config = require("../config.js");

describe("\u{1F680} \x1b[36mSystem program composability tests\x1b[33m", async function () {
  console.log("Network name: " + network.name);

  const solanaConnection = new web3.Connection(
    config.svm_node[network.name],
    "processed"
  );

  const ZERO_AMOUNT = BigInt(0);
  const ZERO_BYTES32 = Buffer.from(
    "0000000000000000000000000000000000000000000000000000000000000000",
    "hex"
  );
  const AMOUNT = ethers.parseUnits("1", 9);

  let deployer,
    neonEVMUser,
    callSystemProgram,
    mockCallSystemProgram,
    tx,
    seed,
    basePubKey,
    rentExemptBalance,
    createWithSeedAccountInBytes,
    info,
    initialRecipientSOLBalance,
    newRecipientSOLBalance;

  before(async function () {
    const deployment = await deployContract("CallSystemProgram", null);
    deployer = deployment.deployer;
    neonEVMUser = deployment.user;
    callSystemProgram = deployment.contract;
    mockCallSystemProgram = (
      await deployContract("MockCallSystemProgram", null)
    ).contract;

    basePubKey = await callSystemProgram.getNeonAddress(
      callSystemProgram.target
    );
    rentExemptBalance =
      await solanaConnection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
  });

  describe("\n\u{231B} \x1b[33m Testing on-chain formatting and execution of Solana's System program \x1b[36mcreateAccountWithSeed\x1b[33m instruction\x1b[0m", function () {
    it("Create account with seed", async function () {
      // Generate the public key of the account we want to create from a seed and the id of the program it will
      // be assigned to
      seed = "seed" + Date.now().toString();
      createWithSeedAccountInBytes =
        await callSystemProgram.getCreateWithSeedAccount(
          basePubKey,
          TOKEN_PROGRAM_ID.toBuffer(),
          Buffer.from(seed)
        );

      // Assign the account to the specified program, allocate space to it and fund it
      tx = await callSystemProgram.createAccountWithSeed(
        TOKEN_PROGRAM_ID.toBuffer(), // SPL token program
        Buffer.from(seed),
        ACCOUNT_SIZE // SPL token account data size
      );
      await tx.wait(1); // Wait for 1 confirmation

      info = await solanaConnection.getAccountInfo(
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );

      info = await getAccount(
        solanaConnection,
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );
    });
  });

  describe("\n\u{231B} \x1b[33m Testing on-chain formatting and execution of Solana's System program \x1b[36mtransfer\x1b[33m instruction\x1b[0m", function () {
    it("Transfer SOL", async function () {
      // Generate a random key pair
      const recipient = web3.Keypair.generate();
      initialRecipientSOLBalance = await solanaConnection.getBalance(
        recipient.publicKey
      );

      // Transfer SOL to the recipient account
      tx = await callSystemProgram.transfer(
        recipient.publicKey.toBuffer(), // Transfer recipient public key
        AMOUNT // Amount of SOL to transfer
      );
      await tx.wait(1); // Wait for 1 confirmation

      newRecipientSOLBalance = await solanaConnection.getBalance(
        recipient.publicKey
      );
    });
  });

  describe("\n\u{231B} \x1b[33m Testing on-chain formatting and execution of Solana's System program \x1b[36massignWithSeed\x1b[33m instruction\x1b[0m", function () {
    it("Assign an account to the Token program", async function () {
      // Generate a new account public key from a seed and the id of the program we want to assign that account to
      seed = "assign" + Date.now().toString();
      createWithSeedAccountInBytes =
        await callSystemProgram.getCreateWithSeedAccount(
          basePubKey,
          TOKEN_PROGRAM_ID.toBuffer(),
          Buffer.from(seed)
        );

      info = await solanaConnection.getAccountInfo(
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );

      // Assign the account to the specified program
      tx = await callSystemProgram.assign(
        TOKEN_PROGRAM_ID.toBuffer(),
        Buffer.from(seed)
      );
      await tx.wait(1); // Wait for 1 confirmation

      info = await solanaConnection.getAccountInfo(
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );
    });
  });

  describe("\n\u{231B} \x1b[33m Testing on-chain formatting and execution of Solana's System program \x1b[36mallocateWithSeed\x1b[33m instruction\x1b[0m", function () {
    it("Allocate storage space to an account", async function () {
      // Generate a new account public key from a seed and program id
      seed = "allocate" + Date.now().toString();
      createWithSeedAccountInBytes =
        await callSystemProgram.getCreateWithSeedAccount(
          basePubKey,
          TOKEN_PROGRAM_ID.toBuffer(),
          Buffer.from(seed)
        );

      // Fund the account to be able to get account info
      // await airdropSOL(
      //   solanaConnection,
      //   new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes)),
      //   parseInt(rentExemptBalance.toString())
      // );

      info = await solanaConnection.getAccountInfo(
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );

      // Allocate storage space to the account
      tx = await callSystemProgram.allocate(
        TOKEN_PROGRAM_ID.toBuffer(),
        Buffer.from(seed),
        ACCOUNT_SIZE
      );
      await tx.wait(1); // Wait for 1 confirmation

      info = await solanaConnection.getAccountInfo(
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );
    });
  });

  describe("\n\u{231B} \x1b[33m Testing Solana's System program \x1b[36mdata getters\x1b[33m\x1b[0m", async function () {
    it("Call account data getters", async function () {
      info = await solanaConnection.getAccountInfo(
        new web3.PublicKey(ethers.encodeBase58(createWithSeedAccountInBytes))
      );
      const balance = await callSystemProgram.getBalance(
        createWithSeedAccountInBytes
      );
      const owner = await callSystemProgram.getOwner(
        createWithSeedAccountInBytes
      );
      const executable = await callSystemProgram.getIsExecutable(
        createWithSeedAccountInBytes
      );
      const rentEpoch = await callSystemProgram.getRentEpoch(
        createWithSeedAccountInBytes
      );
      const space = await callSystemProgram.getSpace(
        createWithSeedAccountInBytes
      );
      const data = await callSystemProgram.getSystemAccountData(
        createWithSeedAccountInBytes,
        space
      );

      const rentExemptionBalance =
        await callSystemProgram.getRentExemptionBalance(space);
      const isRentExempt = await callSystemProgram.isRentExempt(
        createWithSeedAccountInBytes
      );
    });

    it("Test f64 decoding for rent exemption balance calculation", async function () {
      const SPL_TOKEN_ACCOUNT_SIZE = 165;
      const TWO_YEARS_RENT = BigInt(2039280);
      const THREE_POINT_FIVE_YEARS_RENT = BigInt(3568740);
      const ONE_POINT_TWO_YEARS_RENT = BigInt(1223567);
      const ZERO_POINT_FIVE_YEARS_RENT = BigInt(509820);
      const ZERO_POINT_TWENTY_FIVE_YEARS_RENT = BigInt(254910);
    });

    it("Estimate gas usage of on-chain rent exemption balance calculation", async function () {
      const callData = callSystemProgram.interface.encodeFunctionData(
        "getRentExemptionBalance(uint64)",
        [461] // Arbitrary value
      );
      let gas = await ethers.provider.estimateGas({
        from: deployer.address,
        to: callSystemProgram.target,
        data: callData,
        value: 0,
        function(estimatedGas, err) {
          if (err) throw err;
          return estimatedGas;
        },
      });
      console.log(
        "CallSystemProgram.getRentExemptionBalance(uint64) gas usage = " + gas
      );
    });
  });
});
