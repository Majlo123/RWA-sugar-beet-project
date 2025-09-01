// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BEET Token
 * @dev ERC20 token koji predstavlja ulaganje u 1 tonu secerne repe.
 * Samo administrator (owner) moze da "mintuje" (izdaje) nove tokene.
 */
contract BEET is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Sugar Beet Token", "BEET") Ownable(initialOwner) {}

    /**
     * @dev Kreira (mints) specifican broj tokena i salje ih na adresu investitora.
     * Ovu funkciju moze pozvati samo vlasnik ugovora (admin).
     * @param to Adresa investitora.
     * @param amount Broj tokena za izdavanje (u najmanjim jedinicama).
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}