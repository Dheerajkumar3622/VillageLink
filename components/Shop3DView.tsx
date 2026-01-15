
import React, { useEffect, useState } from 'react';
import { Shop, Product } from '../types';
import { getProductsByShop, getShopStyle } from '../services/marketingService';
import { ArrowLeft, ShoppingCart, Info, Package, DollarSign } from 'lucide-react';
import { Button } from './Button';

interface Shop3DViewProps {
    shop: Shop;
    onBack: () => void;
    onBuy: (product: Product) => void;
}

export const Shop3DView: React.FC<Shop3DViewProps> = ({ shop, onBack, onBuy }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

    useEffect(() => {
        getProductsByShop(shop.id).then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, [shop.id]);

    return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onBack} className="text-white bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-white/20 transition">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center text-white">
                    <h2 className="text-xl font-bold text-shadow-lg">{shop.name}</h2>
                    <p className="text-xs opacity-80 flex items-center justify-center gap-1"><Info size={10} /> {shop.location}</p>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* 3D Room Container */}
            <div className="flex-1 relative perspective-1000 overflow-y-auto overflow-x-hidden">
                <div className={`
                    absolute inset-0 bg-gradient-to-b ${getShopStyle(shop.category)}
                    transform-style-3d min-h-full
                `}>
                    {/* Floor pattern overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20 pointer-events-none"></div>
                    
                    {/* Shelf Lighting */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>

                    {loading ? (
                        <div className="flex items-center justify-center h-full text-white animate-pulse">
                            Loading Inventory...
                        </div>
                    ) : (
                        <div className="relative z-10 grid grid-cols-2 gap-6 p-8 pt-24 pb-32 max-w-md mx-auto">
                            {products.map((product, idx) => (
                                <div 
                                    key={product.id}
                                    className={`
                                        relative group cursor-pointer transition-all duration-500 ease-out transform
                                        ${hoveredProduct === product.id ? 'scale-110 z-20 rotate-y-0' : 'scale-100 rotate-y-3 opacity-90'}
                                    `}
                                    onMouseEnter={() => setHoveredProduct(product.id)}
                                    onMouseLeave={() => setHoveredProduct(null)}
                                    onClick={() => onBuy(product)}
                                    style={{ perspective: '500px' }}
                                >
                                    {/* Product "Card" representing a physical item on shelf */}
                                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-b-4 border-slate-500 transform transition-transform duration-300 group-hover:-translate-y-2">
                                        <div className="h-28 bg-slate-200 flex items-center justify-center relative overflow-hidden">
                                            {/* Simulated Product Image/Icon */}
                                            {(product.image && (product.image.startsWith('data:') || product.image.startsWith('http'))) ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-4xl filter drop-shadow-md">
                                                    🧱
                                                </div>
                                            )}
                                            {/* Price Tag */}
                                            <div className="absolute top-2 right-2 bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                                                ₹{product.price}/{product.unit}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-sm text-slate-800 leading-tight">{product.name}</h4>
                                            {product.description && <p className="text-[9px] text-slate-500 mt-1 line-clamp-1">{product.description}</p>}
                                            
                                            <div className="mt-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <span className="text-[10px] text-slate-600 font-bold">In Stock</span>
                                                <div className="bg-slate-700 text-white p-1 rounded-full">
                                                    <ShoppingCart size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Shelf Shadow */}
                                    <div className="absolute -bottom-4 left-2 right-2 h-2 bg-black/40 blur-md rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-4 text-white z-20 border-t border-white/10">
                <p className="text-xs text-center">Tap any material to view details or add to delivery.</p>
            </div>
        </div>
    );
};
