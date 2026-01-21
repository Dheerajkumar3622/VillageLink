/**
 * USS Services - Frontend API Integration
 * USS v3.0
 */

import { API_BASE_URL } from '../config';

// ==================== HELPER ====================

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    };
};

// ==================== QR SERVICE ====================

export const qrService = {
    async generateQR(qrType: string, name: string, entityId?: string) {
        const res = await fetch(`${API_BASE_URL}/api/qr/generate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ qrType, name, entityId })
        });
        return res.json();
    },

    async getQRInfo(qrId: string) {
        const res = await fetch(`${API_BASE_URL}/api/qr/${qrId}/info`);
        return res.json();
    },

    async scanQR(qrId: string, action?: string, location?: { lat: number; lng: number }) {
        const res = await fetch(`${API_BASE_URL}/api/qr/${qrId}/scan`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ action, location })
        });
        return res.json();
    },

    async getMyCodes() {
        const res = await fetch(`${API_BASE_URL}/api/qr/my-codes`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async getScanHistory() {
        const res = await fetch(`${API_BASE_URL}/api/qr/scan-history`, {
            headers: getAuthHeaders()
        });
        return res.json();
    }
};

// ==================== SUPPLY CHAIN SERVICE ====================

export const supplyChainService = {
    // Delivery Quote
    async getDeliveryQuote(
        fromLat: number, fromLng: number,
        toLat: number, toLng: number,
        weightKg: number = 1,
        vehicleType: string = 'AUTO'
    ) {
        const params = new URLSearchParams({
            fromLat: fromLat.toString(),
            fromLng: fromLng.toString(),
            toLat: toLat.toString(),
            toLng: toLng.toString(),
            weightKg: weightKg.toString(),
            vehicleType
        });
        const res = await fetch(`${API_BASE_URL}/api/supply/delivery-quote?${params}`);
        return res.json();
    },

    // Listings
    async createListing(data: any) {
        const res = await fetch(`${API_BASE_URL}/api/supply/listing`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getListings(filters?: {
        productType?: string;
        sellerType?: string;
        district?: string;
        organic?: boolean;
        minPrice?: number;
        maxPrice?: number;
        sort?: string;
    }) {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined) params.append(key, value.toString());
            });
        }
        const res = await fetch(`${API_BASE_URL}/api/supply/listings?${params}`);
        return res.json();
    },

    async getListingDetails(listingId: string) {
        const res = await fetch(`${API_BASE_URL}/api/supply/listing/${listingId}`);
        return res.json();
    },

    async getMyListings() {
        const res = await fetch(`${API_BASE_URL}/api/supply/my-listings`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    // Bidding
    async placeBid(data: {
        listingId: string;
        quantity: number;
        offeredPrice: number;
        message?: string;
        buyerType?: string;
        deliveryPreference?: any;
    }) {
        const res = await fetch(`${API_BASE_URL}/api/supply/bid`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async respondToBid(bidId: string, response: 'ACCEPT' | 'REJECT' | 'COUNTER', counterPrice?: number, counterMessage?: string) {
        const res = await fetch(`${API_BASE_URL}/api/supply/bid/${bidId}/respond`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ response, counterPrice, counterMessage })
        });
        return res.json();
    },

    async getReceivedBids() {
        const res = await fetch(`${API_BASE_URL}/api/supply/bids/received`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async getSentBids() {
        const res = await fetch(`${API_BASE_URL}/api/supply/bids/sent`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    // Orders
    async purchase(data: {
        listingId: string;
        quantity: number;
        deliveryMethod: 'SELF_PICKUP' | 'SELLER_DELIVERY' | 'TRANSPORT_LINK';
        deliveryLocation?: { address: string; lat: number; lng: number };
    }) {
        const res = await fetch(`${API_BASE_URL}/api/supply/purchase`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getMyOrders() {
        const res = await fetch(`${API_BASE_URL}/api/supply/orders/my`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async getReceivedOrders() {
        const res = await fetch(`${API_BASE_URL}/api/supply/orders/received`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async updateOrderStatus(orderId: string, status: string, otp?: string) {
        const res = await fetch(`${API_BASE_URL}/api/supply/order/${orderId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status, otp })
        });
        return res.json();
    },

    // Route Capacity (Driver)
    async publishRouteCapacity(data: any) {
        const res = await fetch(`${API_BASE_URL}/api/supply/route-capacity`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async findMatchingRoutes(fromLat: number, fromLng: number, toLat: number, toLng: number, weightKg: number) {
        const params = new URLSearchParams({
            fromLat: fromLat.toString(),
            fromLng: fromLng.toString(),
            toLat: toLat.toString(),
            toLng: toLng.toString(),
            weightKg: weightKg.toString()
        });
        const res = await fetch(`${API_BASE_URL}/api/supply/match-routes?${params}`);
        return res.json();
    }
};

// ==================== PRICING SERVICE ====================

export const pricingService = {
    async getAllPricing() {
        const res = await fetch(`${API_BASE_URL}/api/pricing/all`);
        return res.json();
    },

    async getPricing(vehicleType: string) {
        const res = await fetch(`${API_BASE_URL}/api/pricing/${vehicleType}`);
        return res.json();
    },

    async updatePricing(vehicleType: string, data: any) {
        const res = await fetch(`${API_BASE_URL}/api/pricing/${vehicleType}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async calculateFare(data: {
        vehicleType: string;
        distanceKm: number;
        weightKg?: number;
        isNight?: boolean;
        surgeMultiplier?: number;
    }) {
        const res = await fetch(`${API_BASE_URL}/api/pricing/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    }
};

// ==================== REELS SERVICE ====================

export const reelsService = {
    async getFeed(userId?: string, limit: number = 10, skip: number = 0) {
        const params = new URLSearchParams({ limit: limit.toString(), skip: skip.toString() });
        if (userId) params.append('userId', userId);
        const res = await fetch(`${API_BASE_URL}/api/reels/feed?${params}`);
        return res.json();
    },

    async getCreatorReels(creatorId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/creator/${creatorId}`);
        return res.json();
    },

    async getReel(reelId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}`);
        return res.json();
    },

    async uploadReel(data: {
        videoUrl: string;
        thumbnailUrl?: string;
        duration?: number;
        caption?: string;
        hashtags?: string[];
        musicId?: string;
        musicTitle?: string;
        locationTag?: { name: string; lat?: number; lng?: number };
        productTags?: any[];
        shopId?: string;
        creatorType?: string;
    }) {
        const res = await fetch(`${API_BASE_URL}/api/reels/upload`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async deleteReel(reelId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async viewReel(reelId: string, userId?: string, watchDuration?: number, watchPercent?: number) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, watchDuration, watchPercent })
        });
        return res.json();
    },

    async likeReel(reelId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/like`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async commentOnReel(reelId: string, comment: string, replyToCommentId?: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/comment`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ comment, replyToCommentId })
        });
        return res.json();
    },

    async getComments(reelId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/comments`);
        return res.json();
    },

    async saveReel(reelId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/save`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async shareReel(reelId: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/share`, {
            method: 'POST'
        });
        return res.json();
    },

    async searchByHashtag(tag: string) {
        const res = await fetch(`${API_BASE_URL}/api/reels/search/hashtag/${tag}`);
        return res.json();
    },

    async getTrending() {
        const res = await fetch(`${API_BASE_URL}/api/reels/trending`);
        return res.json();
    }
};

// ==================== CHAT SERVICE ====================

export const chatService = {
    async getConversations() {
        const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async startConversation(recipientId: string, message?: string, orderId?: string, orderType?: string) {
        const res = await fetch(`${API_BASE_URL}/api/chat/conversation`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ recipientId, message, orderId, orderType })
        });
        return res.json();
    },

    async getConversation(conversationId: string) {
        const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${conversationId}`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async getMessages(conversationId: string, limit: number = 50, before?: string) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (before) params.append('before', before);
        const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${conversationId}/messages?${params}`, {
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async sendMessage(conversationId: string, data: {
        type?: string;
        content?: string;
        mediaUrl?: string;
        productData?: any;
        locationData?: any;
        replyToMessageId?: string;
    }) {
        const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${conversationId}/message`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async deleteMessage(messageId: string) {
        const res = await fetch(`${API_BASE_URL}/api/chat/message/${messageId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return res.json();
    },

    async sendProduct(conversationId: string, productData: { productId: string; productName: string; price: number; image: string }) {
        const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${conversationId}/send-product`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(productData)
        });
        return res.json();
    },

    async sendLocation(conversationId: string, locationData: { lat: number; lng: number; address: string; name?: string }) {
        const res = await fetch(`${API_BASE_URL}/api/chat/conversation/${conversationId}/send-location`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(locationData)
        });
        return res.json();
    },

    async reactToMessage(messageId: string, emoji: string) {
        const res = await fetch(`${API_BASE_URL}/api/chat/message/${messageId}/react`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ emoji })
        });
        return res.json();
    },

    async getUnreadCount() {
        const res = await fetch(`${API_BASE_URL}/api/chat/unread-count`, {
            headers: getAuthHeaders()
        });
        return res.json();
    }
};

// Export all services
export default {
    qr: qrService,
    supplyChain: supplyChainService,
    pricing: pricingService,
    reels: reelsService,
    chat: chatService
};
