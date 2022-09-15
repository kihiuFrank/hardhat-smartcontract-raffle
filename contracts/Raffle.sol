// Raffle tasks

// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completely Automated

// Chainlink Oracle -> randomness, Automated Execution. And to trigger selectin a winner we will use; (Chainlink Keepers)

//------------------------------------------------------------------------------------------------------------------------------------------

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

error Raffle__NotEnoughEthEntered();

contract Raffle {
    /* State Variables */
    uint256 private i_enteranceFee;
    address payable[] private s_prayers;
    constructor(uint256 enteranceFee) {
        i_enteranceFee = enteranceFee;
    }

    function enterRaffle() public payable {
        // you can do this,
        //require (msg.value > i_enteranceFee, "Not Enough ETH!")

        // but we will use error codes for gas efficiency since storing strings if supper expensive
        if (msg.value < i_enteranceFee) {revert Raffle__NotEnoughEthEntered();}
    }

    //function pickRandomWinner(){}

    funtion getEnteranceFee() public view returns(uint256) {
        return i_enteranceFee;
    }

    funtion getPlayers(uint256 index) public view returns(address) {
        return s_prayers[index];
    }

}
