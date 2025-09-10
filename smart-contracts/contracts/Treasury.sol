// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BEET.sol";

/**
 * @title Treasury
 * @dev Ugovor koji upravlja investicijama, mintuje tokene i obradjuje zahteve za prinos.
 */
contract Treasury is Ownable {
    // Adresa naseg BEET token ugovora
    BEET public beetToken;

    // Definicija strukture koja opisuje jednu investiciju
    struct Investment {
        address investor; // Adresa investitora
        uint256 amountUSD; // Ulozeni iznos u USD
        uint256 startTime; // Vreme kada je investicija zapoceta (timestamp)
        uint256 maturesOn; // Vreme kada investicija dospeva (timestamp)
        bool isClaimed; // Da li je prinos isplacen
    }

    // Niz koji cuva sve pojedinacne investicije
    Investment[] public investments;

    // Mapa koja povezuje adresu investitora sa ID-jevima njegovih investicija
    mapping(address => uint256[]) public investmentsByInvestor;
    
    // Konstante definisane prema specifikaciji
    uint256 public constant TOKEN_PRICE_USD = 1000; // Cena jednog tokena je 1000 USD 
    uint256 public constant YIELD_PERCENTAGE = 10; // Prinos je 10% [cite: 7]
    uint256 public constant INVESTMENT_DURATION_SECONDS = 60; // Trajanje ciklusa je 1 godina 

    // Event koji se emituje kada se prinos uspesno zatrazi
    event YieldClaimed(uint256 investmentId, address investor);

    /**
     * @param _beetTokenAddress Adresa deploy-ovanog BEET token ugovora.
     * @param _initialOwner Adresa koja ce biti admin sistema.
     */
    constructor(address _beetTokenAddress, address _initialOwner) Ownable(_initialOwner) {
        beetToken = BEET(_beetTokenAddress);
    }

    /**
     * @dev Admin funkcija za evidentiranje uplate i mintovanje tokena investitoru.
     * @param investor Adresa korisnika koji je investirao.
     * @param amountUSD Iznos u USD koji je korisnik uplatio.
     */
    function recordInvestment(address investor, uint256 amountUSD) public onlyOwner {
        require(amountUSD % TOKEN_PRICE_USD == 0, "Uplata mora biti umnozak cene tokena.");
        
        uint256 investmentId = investments.length;
        uint256 maturityDate = block.timestamp + INVESTMENT_DURATION_SECONDS;

        // Kreiranje i cuvanje nove investicije
        investments.push(Investment({
            investor: investor,
            amountUSD: amountUSD,
            startTime: block.timestamp,
            maturesOn: maturityDate,
            isClaimed: false
        }));

        investmentsByInvestor[investor].push(investmentId);

        // Izracunavanje kolicine tokena za mintovanje
        uint256 tokenAmount = (amountUSD / TOKEN_PRICE_USD) * (10**18); // 1 token = 1000 USD 
        
        // Pozivanje mint funkcije na BEET ugovoru
        beetToken.mint(investor, tokenAmount);
    }

    /**
     * @dev Korisnicka funkcija za trazenje prinosa nakon sto investicija dospe.
     * @param investmentId ID investicije za koju se trazi prinos.
     */
    function claimYield(uint256 investmentId) public {
        require(investmentId < investments.length, "Nepostojeca investicija.");
        Investment storage investment = investments[investmentId];

        require(msg.sender == investment.investor, "Niste vlasnik ove investicije.");
        require(block.timestamp >= investment.maturesOn, "Investicija jos nije dospela.");
        require(!investment.isClaimed, "Prinos je vec isplacen.");

        investment.isClaimed = true;
        emit YieldClaimed(investmentId, msg.sender);
    }

    /**
     * @dev Pomocna funkcija za dohvatanje svih ID-jeva investicija za datog korisnika.
     */
    function getInvestmentIdsForInvestor(address _investor) public view returns (uint256[] memory) {
        return investmentsByInvestor[_investor];
    }
}