# RWA-sugar-beet-project
RWA Šećerna Repa - Projekat blokčejn tokenizacije

Ovaj repozitorijum sadrži kompletan izvorni kod diplomskog rada na temu tokenizacije stvarne imovine (RWA). Projekat je full-stack decentralizovana aplikacija koja simulira proces investiranja u proizvodnju šećerne repe.

Ključne funkcionalnosti:

Pametni ugovori (Solidity): ERC-20 token (BEET) i Treasury ugovor za upravljanje investicijama, postavljeni na Sepolia test mrežu.

Backend (Node.js/Express): REST API za upravljanje korisnicima (registracija, prijava), JWT autenti-fikaciju i sigurne administratorske funkcije.

Baza podataka (PostgreSQL): Čuva podatke o korisnicima, uključujući njihove uloge (admin, user).

Frontend (React): Korisnički interfejs za interakciju sa sistemom, uključujući MetaMask integraciju za povezivanje novčanika, pregled stanja tokena i potraživanje prinosa.

Projekat demonstrira kompletan životni ciklus jedne tokenizovane investicije, od administrativnog evidentiranja "off-chain" uplate, preko "on-chain" izdavanja (mintovanja) tokena, do finalnog potraživanja prinosa od strane investitora.
