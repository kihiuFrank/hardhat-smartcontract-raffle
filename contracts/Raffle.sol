// Raffle tasks

// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completely Automated

// Chainlink Oracle -> randomness, Automated Execution. And to trigger selectin a winner we will use; (Chainlink Keepers)

//------------------------------------------------------------------------------------------------------------------------------------------

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Raffle__NotEnoughEthEntered();

contract Raffle is VRFConsumerBaseV2 {
    /* State Variables */
    uint256 private i_enteranceFee;
    address payable[] private s_prayers;

    /* Events */
    event RaffleEnter(address indexed player);

    constructor(address vrfCoordinatorV2, uint256 enteranceFee)
        VRFConsumerBaseV2(vrfCoordinatorV2)
    {
        i_enteranceFee = enteranceFee;
    }

    function enterRaffle() public payable {
        // you can do this,
        //require (msg.value > i_enteranceFee, "Not Enough ETH!")

        // but we will use error codes for gas efficiency since storing strings if supper expensive
        if (msg.value < i_enteranceFee) {
            revert Raffle__NotEnoughEthEntered();
        }
        s_prayers.push(payable(msg.sender));

        //Emit an event when we update a dynamic array or mapping
        //name events with fuction name reversed. in this case event RaffleEnter()
        emit RaffleEnter(msg.sender);
    }

    function requestRandomWinner() external {
        //Request random number
        // then do something with it
        // chainlink VRF is a 2 transaction process
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {}

    /* view / pure functions */
    function getEnteranceFee() public view returns (uint256) {
        return i_enteranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_prayers[index];
    }
}
