import React from 'react';
import { Check } from 'lucide-react';

interface SuccessAnimationProps {
    message?: string;
    subMessage?: string;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ message = "Success!", subMessage }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 animate-fade-in-up">
            <div className="relative mb-6">
                {/* Expanding Rings */}
                <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping"></div>
                <div className="absolute inset-0 bg-green-500 rounded-full opacity-10 animate-pulse delay-100"></div>

                {/* Main Circle */}
                <div className="relative w-24 h-24 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full shadow-[0_10px_40px_rgba(34,197,94,0.4)] flex items-center justify-center transform transition-transform hover:scale-105">
                    <Check size={48} className="text-white drop-shadow-md animate-[bounce_1s_ease-out]" strokeWidth={3} />
                </div>
            </div>

            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 mb-2 text-center">
                {message}
            </h3>

            {subMessage && (
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium animate-[fadeInUp_0.8s_ease-out_forwards]">
                    {subMessage}
                </p>
            )}
        </div>
    );
};
