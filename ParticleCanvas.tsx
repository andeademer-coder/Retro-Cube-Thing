import React, { useRef, useEffect } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import type { Particle } from './types';

interface ParticleCanvasProps {
    particles: Particle[];
}

const shadeColor = (color: string, percent: number): string => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.floor(R * (100 + percent) / 100);
    G = Math.floor(G * (100 + percent) / 100);
    B = Math.floor(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;
    
    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const RR = ((R.toString(16).length === 1) ? `0${R.toString(16)}` : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? `0${G.toString(16)}` : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? `0${B.toString(16)}` : B.toString(16));

    return `#${RR}${GG}${BB}`;
};


const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ particles }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const container = canvas.parentElement as HTMLElement;
        if (!container) return;

        const { width, height } = container.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const cellWidth = canvas.width / BOARD_WIDTH;
        const cellHeight = canvas.height / BOARD_HEIGHT;

        context.clearRect(0, 0, canvas.width, canvas.height);
            
        particles.forEach(p => {
            context.globalAlpha = 1;

            const particleSizeX = cellWidth * p.size;
            const particleSizeY = cellHeight * p.size;

            if (p.isSquare) {
                const burnedColor = shadeColor(p.color, -30);
                
                context.save();
                context.translate(p.x * cellWidth, p.y * cellHeight);
                context.rotate(p.rotation);
                
                // Main "burned" body
                context.fillStyle = burnedColor;
                context.fillRect(-particleSizeX / 2, -particleSizeY / 2, particleSizeX, particleSizeY);
                
                // "Crack" effect
                context.strokeStyle = 'rgba(0,0,0,0.4)';
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(-particleSizeX / 2, -particleSizeY / 4);
                context.lineTo(particleSizeX / 2, particleSizeY / 4);
                context.stroke();

                context.restore();
            } else { // Fallback for circular particles if ever used
                context.fillStyle = p.color;
                context.beginPath();
                context.arc(p.x * cellWidth, p.y * cellHeight, particleSizeX / 2, 0, Math.PI * 2);
                context.fill();
            }
        });

    }, [particles]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-20" />;
};

export default ParticleCanvas;