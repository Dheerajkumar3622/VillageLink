import React from 'react';

/**
 * FloatingVehicle - A premium decorative component featuring a 3D futuristic vehicle
 * that appears to float seamlessly over the application background.
 * Whisk 3.0 / VillageLink Vision 2.0
 */

interface FloatingVehicleProps {
    className?: string;
    size?: number | string;
}

export const FloatingVehicle: React.FC<FloatingVehicleProps> = ({ className = '', size = '200px' }) => {
    // Using the absolute path to the generated matched-background image
    const vehicleImagePath = 'file:///C:/Users/DELL/.gemini/antigravity/brain/4f393f6c-07b5-4b6c-95e2-d919a31053a4/vehicle_matched_bg_v2_1769027665284.png';

    const vehicleRef = React.useRef<HTMLImageElement>(null);

    React.useEffect(() => {
        if (vehicleRef.current) {
            vehicleRef.current.style.setProperty('--vehicle-size', String(size));
        }
    }, [size]);

    return (
        <div className="floating-vehicle">
            <img
                ref={vehicleRef}
                src={vehicleImagePath}
                alt="Floating Futuristic Vehicle"
                className="vehicle-img"
            />
        </div>
    );
};

export default FloatingVehicle;
