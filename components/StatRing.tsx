/**
 * StatRing - V5 Animated Progress Ring Component
 * Displays a circular progress indicator with animated counter
 */

import React, { useEffect, useRef, useState } from 'react';

interface StatRingProps {
    value: number | string;
    label: string;
    progress?: number; // 0-100 percentage
    color?: 'emerald' | 'cyan' | 'purple' | 'warm' | 'hot';
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
}

const colorMap = {
    emerald: 'var(--accent-primary)',
    cyan: 'var(--accent-secondary)',
    purple: 'var(--accent-tertiary)',
    warm: 'var(--accent-warm)',
    hot: 'var(--accent-hot)'
};

export const StatRing: React.FC<StatRingProps> = ({
    value,
    label,
    progress = 75,
    color = 'emerald',
    size = 'md',
    animate = true
}) => {
    const ringRef = useRef<HTMLDivElement>(null);
    const [displayValue, setDisplayValue] = useState<number | string>(animate && typeof value === 'number' ? 0 : value);

    const sizeClass = {
        sm: 'w-16 h-16',
        md: 'w-20 h-20',
        lg: 'w-24 h-24'
    }[size];

    const textSize = {
        sm: 'text-base',
        md: 'text-lg',
        lg: 'text-xl'
    }[size];

    const labelSize = {
        sm: 'text-[8px]',
        md: 'text-[9px]',
        lg: 'text-[10px]'
    }[size];

    // Calculate stroke dashoffset based on progress
    const circumference = 2 * Math.PI * 35; // radius = 35
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    useEffect(() => {
        if (animate && typeof value === 'number') {
            const duration = 2000;
            const startTime = Date.now();
            const startValue = 0;

            const animateValue = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.floor(startValue + (value - startValue) * easeOut);
                setDisplayValue(currentValue);

                if (progress < 1) {
                    requestAnimationFrame(animateValue);
                } else {
                    setDisplayValue(value);
                }
            };

            requestAnimationFrame(animateValue);
        }
    }, [value, animate]);

    useEffect(() => {
        if (ringRef.current) {
            ringRef.current.style.setProperty('--progress-offset', `${strokeDashoffset}`);
            ringRef.current.style.setProperty('--ring-color', colorMap[color]);
        }
    }, [progress, color, strokeDashoffset]);

    return (
        <div
            ref={ringRef}
            className={`${sizeClass} v5-stat-ring relative cursor-pointer`}
        >
            <svg viewBox="0 0 80 80" className="absolute inset-0 w-[90%] h-[90%] m-auto -rotate-90">
                <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth="3"
                />
                <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke={colorMap[color]}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <span className={`${textSize} font-extrabold font-mono z-10 text-[var(--text-primary)]`}>
                {displayValue}
            </span>
            <span className={`${labelSize} text-[var(--text-muted)] uppercase tracking-wide z-10`}>
                {label}
            </span>
        </div>
    );
};

export default StatRing;
