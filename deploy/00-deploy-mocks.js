const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25") //0.25 is the premium. It costs 0.25 LINK per request
const GAS_PRICE_LINK = 1e9 // 1000000000 // calculated value based on the gas price of the chain. // or link per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]
    //const chainId = network.config.chainId

    if (developmentChains.includes(network.name)) {
        log("Local Network detected! Deploying mocks...")
        //deploy a mock vrfCoordinator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed!")
        log(
            "---------------------------------------------------------------------------------------------------------------------"
        )
    }
}

module.exports.tags = ["all", "mocks"]
