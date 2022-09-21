const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network, deployments } = require("hardhat")
const { r } = require("tar")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = networkConfig.chainId
          beforeEach(async function () {
              //const { deployer } = await getNamedAccounts()
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEnteranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("intializes the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["interval"]
                  )
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughEthEntered"
                  )
              })

              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayers(0)
                  assert.equal(playerFromContract, deployer)
              })

              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })

              it("doesn't allow entrance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // or
                  // await network.provider.request({method: "evm_mine", params: []})

                  // we pretend to be a chainlink keeper by calling performUpkeep()
                  // so that the contract can be in RaffleState.CALCULATING
                  await raffle.performUpkeep([]) // at this point the raffle is in CALCULATING state

                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])

                  //callStatic helps simulate sending the transaction
                  // so we can see what upKeepNeeded returns
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  // upkeepNeeded should return false so assert false
                  assert(!upkeepNeeded)
              })

              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // or
                  // await network.provider.request({method: "evm_mine", params: []})

                  // we pretend to be a chainlink keeper by calling performUpkeep()
                  // so that the contract can be in RaffleState.CALCULATING
                  await raffle.performUpkeep([]) // at this point the raffle is in CALCULATING state
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) // params [] is same as "0x"
                  // upkeepNeeded should return false so assert false
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })

              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })

              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee }) // enter the raffle
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]) // increase the time
                  await network.provider.request({ method: "evm_mine", params: [] }) // mine a new block
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkUpkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee }) // enter the raffle
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]) // increase the time
                  await network.provider.request({ method: "evm_mine", params: [] }) // mine a new block
                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })

              it("reverts when checkUpkeep is false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded"
                  )
              })

              it("updates the raffle state, emits an event, and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee }) // enter the raffle
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]) // increase the time
                  await network.provider.request({ method: "evm_mine", params: [] }) // mine a new block
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toString() == "1")
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee }) // enter the raffle
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]) // increase the time
                  await network.provider.request({ method: "evm_mine", params: [] }) // mine a new block
              })
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.rejectedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.rejectedWith("nonexistent request")
              })

              // This test is too big...
              // This test simulates users entering the raffle and wraps the entire functionality of the raffle
              // inside a promise that will resolve if everything is successful.
              // An event listener for the WinnerPicked is set up
              // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
              // All the assertions are done once the WinnerPicked event is fired
              it("picks winner, resets the lottery, and sends money", async function () {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1 // Since deployer = 0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimestamp = await raffle.getLastestTimeStamp() // stores starting timestamp (before we fire our event)

                  // performUpkeep which will (mock being chainlink keepers) which will kick off calling,
                  // fulfillRandomWords and we will (mock being the chainlink VRF) as well
                  // on a testnet, we will  have to wait for the fulfillRandomWords to be called
                  // we need to simulate that we need to wait for that event to be called
                  // so we do that by setting up a listener
                  // and we don't want the test to finish before the listner is done listening so we need to create a new promise.

                  // This will be more important for our staging tests...
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          // setting up the event listener for WinnerPicked
                          console.log("WinnerPicked event fired!")
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              // Now lets get the ending values...
                              const recentWinner = await raffle.getRecentWinner()
                              console.log("Winner is; ", recentWinner)
                              console.log(accounts[2].address)
                              console.log(accounts[0].address)
                              console.log(accounts[1].address)
                              console.log(accounts[3].address)
                              const raffleState = await raffle.getRaffleState()
                              const endingTimestamp = await raffle.getLastestTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimestamp > startingTimestamp)
                          } catch (e) {
                              reject(e)
                          }

                          resolve()
                      })
                      //Setting up the listener

                      // below we will fire the event, and the listener will pick it up, and resolve

                      // mocking chainlink keepers
                      const tx = await raffle.performUpkeep([]) //error fix. I had failed to pass in the empty args -> []
                      const txReceipt = await tx.wait(1)
                      //mocking the chainlink VRF
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
