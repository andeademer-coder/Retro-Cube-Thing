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
            if (p.type === 'smoke') {
                const lifeRatio = p.life / p.initialLife;
                const alpha = Math.max(0, lifeRatio * 0.5); // Fade out, max alpha 0.5
                
                context.beginPath();
                context.arc(p.x * cellWidth, p.y * cellHeight, p.radius * cellWidth, 0, Math.PI * 2);
                const shadeValue = Math.floor(p.shade);
                context.fillStyle = `rgba(${shadeValue}, ${shadeValue}, ${shadeValue}, ${alpha})`;
                context.fill();
            } else { // 'debris'
                context.globalAlpha = 1;

                const burnedColor = shadeColor(p.color, p.shade);
                
                context.save();
                context.translate(p.x * cellWidth, p.y * cellHeight);
                context.rotate(p.rotation);
                
                context.fillStyle = burnedColor;
                context.strokeStyle = 'rgba(0,0,0,0.4)';
                context.lineWidth = 1;

                if (p.shapePoints.length > 2) {
                    context.beginPath();
                    context.moveTo(p.shapePoints[0].x * cellWidth, p.shapePoints[0].y * cellHeight);
                    for (let i = 1; i < p.shapePoints.length; i++) {
                        context.lineTo(p.shapePoints[i].x * cellWidth, p.shapePoints[i].y * cellHeight);
                    }
                    context.closePath();
                    context.fill();
                    context.stroke();
                }
    
                context.restore();
            }
        });

    }, [particles]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-20" />;
};

export default ParticleCanvas;