
import { Shop, Product, ShopCategory } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';

const MARKET_URL = `${API_BASE_URL}/api/market`;

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAuthToken() || ''
});

export const getShops = async (): Promise<Shop[]> => {
    try {
        const res = await fetch(`${MARKET_URL}/shops`);
        if (!res.ok) throw new Error("Failed to fetch shops");
        return await res.json();
    } catch (e) {
        console.error(e);
        return []; // Return empty if DB connection fails
    }
};

export const getProductsByShop = async (shopId: string): Promise<Product[]> => {
    try {
        const res = await fetch(`${MARKET_URL}/products?shopId=${shopId}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getAllProducts = async (): Promise<Product[]> => {
    try {
        const res = await fetch(`${MARKET_URL}/products`);
        if (!res.ok) throw new Error("Failed to fetch products");
        return await res.json();
    } catch (e) {
        return [];
    }
};

export const createShop = async (shop: Shop): Promise<boolean> => {
    try {
        const res = await fetch(`${MARKET_URL}/shops`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(shop)
        });
        return res.ok;
    } catch (e) { return false; }
};

export const addProduct = async (product: Product): Promise<boolean> => {
    try {
        const res = await fetch(`${MARKET_URL}/products`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        return res.ok;
    } catch (e) { return false; }
};

// Maps category to a color style for 3D walls
export const getShopStyle = (category: ShopCategory) => {
    return 'from-slate-700 to-slate-950';
};
