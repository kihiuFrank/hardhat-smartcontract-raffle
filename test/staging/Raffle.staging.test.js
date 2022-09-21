const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network, deployments } = require("hardhat")
const { r } = require("tar")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntranceFee, deployer
          beforeEach(async function () {
              //const { deployer } = await getNamedAccounts()
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEnteranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live chainlink keepers and chainlink VRF, we get a random winner", async function () {
                  console.log("Setting up test...")
                  // grab starting timestamp
                  const startingTimestamp = await raffle.getLastestTimeStamp()

                  const accounts = await ethers.getSigners()

                  // set up a listener before we enter the raffle
                  // just incase the blockchain moves really fast
                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimestamp = await raffle.getLastestTimeStamp()

                              await expect(raffle.getPlayers(0)).to.be.reverted
                              //assert.equal(recentWinner.toString(), deployer.toString())
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimestamp > startingTimestamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // enter the raffle
                      console.log("Entering Raffle...")
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      // this code won't complete until listener has finished listening
                  })
              })
          })
      })
