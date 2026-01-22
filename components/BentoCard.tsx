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
    colorClass?: 'v5-icon-emerald' | 'v5-icon-cyan' | 'v5-icon-purple' | 'v5-icon-warm' | 'v5-icon-hot';
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
            className={`v5-bento-card p-5 text-left group cursor-pointer ${large ? 'col-span-2' : ''} ${className}`}
            onClick={onClick}
        >
            {/* Live Badge */}
            {badge && (
                <span className="v5-live-badge absolute top-4 right-4">
                    <span className="v5-live-dot"></span>
                    {badge}
                </span>
            )}

            {/* Icon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ${colorClass}`}>
                {isEmojiIcon ? (
                    <span className="text-2xl">{icon}</span>
                ) : (
                    <span className="text-white">{icon}</span>
                )}
            </div>

            {/* Content */}
            <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {description}
                </p>
            )}
        </div>
    );
};

export default BentoCard;
