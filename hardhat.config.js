require("@nomicfoundation/hardhat-toolbox")
require("@nomicfoundation/hardhat-chai-matchers")
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-ethers")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""
const GOERLI_RPC_URL =
    process.env.GOERLI_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key"
const RINKEBY_RPC_URL =
    process.env.RINKEBY_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key"
const PRIVATE_KEY =
    process.env.PRIVATE_KEY || "0x11ee3108a03081fe260ecdc106554d09d9d1209bcafd46942b10e02943effc4a"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        rinkeby: {
            url: RINKEBY_RPC_URL || "",
            accounts: [PRIVATE_KEY],
            chainId: 4,
            blockConfirmations: 6,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            blockConfirmations: 6,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            //accounts: Hardhat will sort
            chainId: 31337,
        },
    },
    solidity: "0.8.17",
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
}
