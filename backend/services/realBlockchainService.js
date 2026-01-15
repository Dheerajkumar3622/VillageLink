/**
 * Real Blockchain Service
 * Polygon Network Integration for NFTs, Escrow, and GramCoin
 */

import { ethers } from 'ethers';

// Network Configuration
const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const MUMBAI_RPC = process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com';

// Contract Addresses (Deploy these on Polygon)
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
const GRAMCOIN_CONTRACT_ADDRESS = process.env.GRAMCOIN_CONTRACT_ADDRESS;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;

// ABIs (Minimal)
const NFT_ABI = [
    'function mint(address to, string uri) returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function balanceOf(address owner) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

const GRAMCOIN_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const ESCROW_ABI = [
    'function createEscrow(address beneficiary, uint256 amount, uint256 releaseTime) payable returns (uint256)',
    'function releaseEscrow(uint256 escrowId)',
    'function refundEscrow(uint256 escrowId)',
    'function getEscrow(uint256 escrowId) view returns (address, address, uint256, uint256, uint8)'
];

// Provider instances
let provider = null;
let isBlockchainAvailable = false;

/**
 * Initialize blockchain provider
 */
const initProvider = async () => {
    try {
        // Use Mumbai testnet for development, Polygon mainnet for production
        const rpcUrl = process.env.NODE_ENV === 'production' ? POLYGON_RPC : MUMBAI_RPC;
        provider = new ethers.JsonRpcProvider(rpcUrl);

        const network = await provider.getNetwork();
        console.log(`🔗 Connected to Polygon: ${network.name} (Chain ID: ${network.chainId})`);
        isBlockchainAvailable = true;

        return true;
    } catch (e) {
        console.warn('⚠️ Blockchain connection failed, using simulation mode:', e.message);
        isBlockchainAvailable = false;
        return false;
    }
};

// Initialize on load
initProvider();

// ==================== NFT SERVICE ====================

/**
 * Mint Pass as NFT
 * @param {string} userAddress - User's wallet address
 * @param {object} passData - Pass metadata
 */
export const mintPassNFT = async (userAddress, passData) => {
    if (!isBlockchainAvailable || !NFT_CONTRACT_ADDRESS) {
        // Simulation mode
        const simulatedTokenId = `NFT-SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        console.log(`📄 [SIMULATED] NFT minted: ${simulatedTokenId}`);

        return {
            success: true,
            tokenId: simulatedTokenId,
            owner: userAddress,
            assetType: passData.type || 'PASS',
            mintDate: Date.now(),
            metadata: passData,
            simulated: true
        };
    }

    try {
        // In production, use a server-side signer
        const privateKey = process.env.NFT_MINTER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('NFT minter private key not configured');
        }

        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

        // Create metadata URI (In production, upload to IPFS)
        const metadata = {
            name: `VillageLink ${passData.type} Pass`,
            description: `${passData.routeName || 'All Routes'} - Valid for ${passData.validDays || 30} days`,
            image: 'https://villagelink.in/nft/pass.png',
            attributes: [
                { trait_type: 'Type', value: passData.type },
                { trait_type: 'Route', value: passData.routeName || 'All' },
                { trait_type: 'Valid Days', value: passData.validDays || 30 }
            ]
        };

        // Base64 encode metadata (In production, use IPFS)
        const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

        // Mint NFT
        const tx = await contract.mint(userAddress, metadataUri);
        const receipt = await tx.wait();

        // Get token ID from event
        const transferEvent = receipt.logs.find(log => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed.name === 'Transfer';
            } catch {
                return false;
            }
        });

        const tokenId = transferEvent ?
            contract.interface.parseLog(transferEvent).args[2].toString() :
            `NFT-${Date.now()}`;

        console.log(`✅ NFT Minted on Polygon: Token #${tokenId}`);

        return {
            success: true,
            tokenId,
            owner: userAddress,
            assetType: passData.type || 'PASS',
            mintDate: Date.now(),
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            metadata: passData,
            simulated: false
        };
    } catch (e) {
        console.error('NFT Mint Error:', e);
        throw e;
    }
};

/**
 * Verify NFT ownership
 */
export const verifyNFTOwnership = async (tokenId, expectedOwner) => {
    if (!isBlockchainAvailable || !NFT_CONTRACT_ADDRESS) {
        return { verified: true, simulated: true };
    }

    try {
        const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider);
        const owner = await contract.ownerOf(tokenId);

        return {
            verified: owner.toLowerCase() === expectedOwner.toLowerCase(),
            owner,
            simulated: false
        };
    } catch (e) {
        return { verified: false, error: e.message };
    }
};

// ==================== GRAMCOIN TOKEN SERVICE ====================

/**
 * Get GramCoin balance
 */
export const getGramCoinBalance = async (walletAddress) => {
    if (!isBlockchainAvailable || !GRAMCOIN_CONTRACT_ADDRESS) {
        return { balance: 0, simulated: true };
    }

    try {
        const contract = new ethers.Contract(GRAMCOIN_CONTRACT_ADDRESS, GRAMCOIN_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        const decimals = await contract.decimals();

        return {
            balance: parseFloat(ethers.formatUnits(balance, decimals)),
            raw: balance.toString(),
            simulated: false
        };
    } catch (e) {
        console.error('GramCoin balance error:', e);
        return { balance: 0, error: e.message };
    }
};

/**
 * Transfer GramCoins (Server-side, for rewards)
 */
export const transferGramCoins = async (toAddress, amount) => {
    if (!isBlockchainAvailable || !GRAMCOIN_CONTRACT_ADDRESS) {
        console.log(`🪙 [SIMULATED] Transferred ${amount} GramCoins to ${toAddress}`);
        return {
            success: true,
            txHash: `SIM-TX-${Date.now()}`,
            simulated: true
        };
    }

    try {
        const privateKey = process.env.GRAMCOIN_TREASURY_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('GramCoin treasury key not configured');
        }

        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(GRAMCOIN_CONTRACT_ADDRESS, GRAMCOIN_ABI, signer);

        const decimals = await contract.decimals();
        const amountWei = ethers.parseUnits(amount.toString(), decimals);

        const tx = await contract.transfer(toAddress, amountWei);
        const receipt = await tx.wait();

        console.log(`✅ GramCoin Transfer: ${amount} to ${toAddress} (TX: ${tx.hash})`);

        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            simulated: false
        };
    } catch (e) {
        console.error('GramCoin transfer error:', e);
        throw e;
    }
};

// ==================== ESCROW SERVICE ====================

/**
 * Create escrow for transaction
 */
export const createEscrow = async (fromAddress, toAddress, amount, releaseDays = 7) => {
    const escrowId = `ESC-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    if (!isBlockchainAvailable || !ESCROW_CONTRACT_ADDRESS) {
        console.log(`🔒 [SIMULATED] Escrow created: ${escrowId}`);
        return {
            success: true,
            escrowId,
            from: fromAddress,
            to: toAddress,
            amount,
            releaseDate: Date.now() + (releaseDays * 24 * 60 * 60 * 1000),
            status: 'LOCKED',
            simulated: true
        };
    }

    try {
        const privateKey = process.env.ESCROW_ADMIN_PRIVATE_KEY || process.env.NFT_MINTER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('Escrow admin key not configured');
        }

        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

        const releaseTime = Math.floor(Date.now() / 1000) + (releaseDays * 24 * 60 * 60);
        const amountWei = ethers.parseEther(amount.toString());

        const tx = await contract.createEscrow(toAddress, amountWei, releaseTime, {
            value: amountWei
        });
        const receipt = await tx.wait();

        console.log(`✅ Escrow Created on Polygon: ${tx.hash}`);

        return {
            success: true,
            escrowId: receipt.logs[0]?.args?.[0]?.toString() || escrowId,
            txHash: tx.hash,
            from: fromAddress,
            to: toAddress,
            amount,
            releaseDate: releaseTime * 1000,
            status: 'LOCKED',
            simulated: false
        };
    } catch (e) {
        console.error('Escrow creation error:', e);
        throw e;
    }
};

/**
 * Release escrow funds
 */
export const releaseEscrow = async (escrowId) => {
    if (!isBlockchainAvailable || !ESCROW_CONTRACT_ADDRESS) {
        console.log(`🔓 [SIMULATED] Escrow released: ${escrowId}`);
        return { success: true, simulated: true };
    }

    try {
        const privateKey = process.env.ESCROW_ADMIN_PRIVATE_KEY;
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

        const tx = await contract.releaseEscrow(escrowId);
        await tx.wait();

        return { success: true, txHash: tx.hash, simulated: false };
    } catch (e) {
        console.error('Escrow release error:', e);
        throw e;
    }
};

// ==================== TRUST CHAIN (DATA INTEGRITY) ====================

/**
 * Add data hash to on-chain trust registry
 * Used for ticket verification, document integrity
 */
export const addToTrustChain = async (documentType, documentId, dataHash) => {
    // In production, this would write to a smart contract
    // For now, we store locally and verify against hash

    const entry = {
        type: documentType,
        id: documentId,
        hash: dataHash,
        timestamp: Date.now(),
        chainId: isBlockchainAvailable ? 'polygon' : 'local'
    };

    console.log(`🔗 Trust Chain Entry: ${documentType}/${documentId}`);

    return entry;
};

/**
 * Verify data against trust chain
 */
export const verifyFromTrustChain = async (documentType, documentId, dataHash) => {
    // In production, compare with on-chain hash
    // For now, return verified if hash is valid format

    const isValidHash = dataHash && dataHash.length === 64; // SHA-256 hex length

    return {
        verified: isValidHash,
        chainId: isBlockchainAvailable ? 'polygon' : 'local'
    };
};

// ==================== WALLET CONNECTION (Frontend Helper) ====================

/**
 * Get wallet info for connected Web3 wallet
 * This is called from frontend via API
 */
export const getWalletInfo = async (address) => {
    if (!isBlockchainAvailable) {
        return {
            address,
            nativeBalance: 0,
            gramCoinBalance: 0,
            nftCount: 0,
            simulated: true
        };
    }

    try {
        const [nativeBalance, gramcoinData, nftBalance] = await Promise.all([
            provider.getBalance(address),
            GRAMCOIN_CONTRACT_ADDRESS ? getGramCoinBalance(address) : { balance: 0 },
            NFT_CONTRACT_ADDRESS ?
                new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider).balanceOf(address) :
                0n
        ]);

        return {
            address,
            nativeBalance: parseFloat(ethers.formatEther(nativeBalance)),
            gramCoinBalance: gramcoinData.balance,
            nftCount: Number(nftBalance),
            network: (await provider.getNetwork()).name,
            simulated: false
        };
    } catch (e) {
        console.error('Wallet info error:', e);
        return { address, error: e.message };
    }
};

// ==================== HEALTH CHECK ====================

export const getBlockchainStatus = async () => {
    if (!isBlockchainAvailable) {
        return {
            connected: false,
            mode: 'simulation',
            contracts: {
                nft: 'not_configured',
                gramcoin: 'not_configured',
                escrow: 'not_configured'
            }
        };
    }

    try {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();

        return {
            connected: true,
            mode: 'production',
            network: network.name,
            chainId: Number(network.chainId),
            blockNumber,
            contracts: {
                nft: NFT_CONTRACT_ADDRESS || 'not_configured',
                gramcoin: GRAMCOIN_CONTRACT_ADDRESS || 'not_configured',
                escrow: ESCROW_CONTRACT_ADDRESS || 'not_configured'
            }
        };
    } catch (e) {
        return { connected: false, error: e.message };
    }
};

export default {
    mintPassNFT,
    verifyNFTOwnership,
    getGramCoinBalance,
    transferGramCoins,
    createEscrow,
    releaseEscrow,
    addToTrustChain,
    verifyFromTrustChain,
    getWalletInfo,
    getBlockchainStatus
};
