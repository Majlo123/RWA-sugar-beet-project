// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BEET.sol";

/**
 * @title Treasury
 * @dev Contract that manages investments, mints tokens, and processes yield-claim requests.
 */
contract Treasury is Ownable {
    // Address of our BEET token contract.
    BEET public beetToken;

    // Struct describing a single investment.
    struct Investment {
        address investor; // Investor's address
        uint256 amountUSD; // Amount invested in USD
        uint256 startTime; // Timestamp when the investment started
        uint256 maturesOn; // Timestamp when the investment matures
        bool isClaimed; // Whether the yield has been paid out
    }

    // Array that stores every individual investment.
    Investment[] public investments;

    // Map linking an investor's address to the IDs of their investments.
    mapping(address => uint256[]) public investmentsByInvestor;

    // Constants defined by the specification.
    uint256 public constant TOKEN_PRICE_USD = 1000; // Price of one token is 1000 USD
    uint256 public constant YIELD_PERCENTAGE = 10; // Yield is 10% [cite: 7]
    uint256 public constant INVESTMENT_DURATION_SECONDS = 20; // Cycle duration is 1 year

    // Event emitted when the yield is successfully claimed.
    event YieldClaimed(uint256 investmentId, address investor);

    /**
     * @param _beetTokenAddress Address of the deployed BEET token contract.
     * @param _initialOwner Address that will be the system admin.
     */
    constructor(address _beetTokenAddress, address _initialOwner) Ownable(_initialOwner) {
        beetToken = BEET(_beetTokenAddress);
    }

    /**
     * @dev Admin function for recording a payment and minting tokens to the investor.
     * @param investor Address of the user who invested.
     * @param amountUSD Amount in USD that the user paid.
     */
    function recordInvestment(address investor, uint256 amountUSD) public onlyOwner {
        require(amountUSD % TOKEN_PRICE_USD == 0, "Payment must be a multiple of the token price.");

        uint256 investmentId = investments.length;
        uint256 maturityDate = block.timestamp + INVESTMENT_DURATION_SECONDS;

        // Create and store the new investment.
        investments.push(Investment({
            investor: investor,
            amountUSD: amountUSD,
            startTime: block.timestamp,
            maturesOn: maturityDate,
            isClaimed: false
        }));

        investmentsByInvestor[investor].push(investmentId);

        // Calculate how many tokens to mint.
        uint256 tokenAmount = (amountUSD / TOKEN_PRICE_USD) * (10**18); // 1 token = 1000 USD

        // Call the mint function on the BEET contract.
        beetToken.mint(investor, tokenAmount);
    }

    /**
     * @dev User function for claiming the yield after the investment matures.
     * @param investmentId ID of the investment whose yield is being claimed.
     */
    function claimYield(uint256 investmentId) public {
        require(investmentId < investments.length, "Investment does not exist.");
        Investment storage investment = investments[investmentId];

        require(msg.sender == investment.investor, "You are not the owner of this investment.");
        require(block.timestamp >= investment.maturesOn, "Investment has not matured yet.");
        require(!investment.isClaimed, "Yield has already been claimed.");

        investment.isClaimed = true;
        emit YieldClaimed(investmentId, msg.sender);
    }

    /**
     * @dev Helper function for fetching all investment IDs belonging to a given user.
     */
    function getInvestmentIdsForInvestor(address _investor) public view returns (uint256[] memory) {
        return investmentsByInvestor[_investor];
    }
}