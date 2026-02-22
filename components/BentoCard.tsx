/**
 * BentoCard - V5 Feature Card Component
 * Flexible bento-style card with icon, title, description, and optional badges
 */

import React from 'react';

interface BentoCardProps {
    icon: React.ReactNode | string;
    title: string;
    description?: string;
    badge?: string;
    colorClass?: 'v5-icon-emerald' | 'v5-icon-cyan' | 'v5-icon-purple' | 'v5-icon-warm' | 'v5-icon-hot' | 'v5-icon-rose' | 'v5-icon-blue' | 'v5-icon-gold' | 'v5-icon-sky' | 'v5-icon-indigo';
    onClick?: () => void;
    className?: string;
    large?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
    icon,
    title,
    description,
    badge,
    colorClass = 'v5-icon-emerald',
    onClick,
    className = '',
    large = false
}) => {
    const isEmojiIcon = typeof icon === 'string';

    return (
        <div
            className={`v5-bento-card group cursor-pointer ${large ? 'col-span-2' : ''} ${className}`}
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
            }}
        >
            {/* Icon - Blue Container Match */}
            <div className="v5-icon-container-match group-hover:scale-105 transition-transform duration-300">
                {isEmojiIcon ? (
                    <span className="text-3xl filter drop-shadow-md">{icon}</span>
                ) : (
                    <div className="scale-125 text-white">{icon}</div>
                )}
            </div>

            {/* Title - Bold Black */}
            <h3 
                className="text-[11px] font-[900] text-white group-hover:text-luxe-gold transition-colors px-1 uppercase tracking-tight text-center"
                style={{ lineHeight: 1.1, maxWidth: '80px' }}
            >
                {title}
            </h3>
        </div>
    );
};

export default BentoCard;
