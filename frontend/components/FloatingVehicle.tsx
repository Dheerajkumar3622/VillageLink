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
    // Using a reliable local relative asset path
    const vehicleImagePath = '/assets/hero-bus-icon.png';

    const vehicleRef = React.useRef<HTMLImageElement>(null);

    React.useEffect(() => {
        if (vehicleRef.current) {
            vehicleRef.current.style.setProperty('--vehicle-size', String(size));
        }
    }, [size]);

    return (
        <div className="floating-vehicle-container animate-float-vehicle">
            <img
                ref={vehicleRef}
                src={vehicleImagePath}
                alt="Floating Futuristic Vehicle"
                className="vehicle-img"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
        </div>
    );
};

export default FloatingVehicle;
