import React, { useRef, useEffect } from 'react';
import type { BackgroundTheme } from './types';

interface BackgroundCanvasProps {
    theme: BackgroundTheme;
}

// Helper types for non-physics themes
type Star = { x: number; y: number; radius: number; alpha: number; twinkleSpeed: number; };
type Leaf = { x: number; y: number; size: number; speed: number; rotation: number; rotationSpeed: number; };
type DustMote = { x: number; y: number; radius: number; speedX: number; speedY: number; alpha: number; };

// Types for the new Physics-Based Volcanic theme
type TerrainPoint = { x: number; y: number };
type PhysicsSmokeParticle = { x: number; y: number; vx: number; vy: number; radius: number; life: number; initialLife: number; };
type Meteor = { x: number; y: number; vx: number; vy: number; radius: number; };
type Shockwave = { x: number; y: number; radius: number; life: number; initialLife: number; strength: number; };
type ExplosionParticle = { x: number; y: number; vx: number; vy: number; radius: number; life: number; initialLife: number; color: string; };
type ScreenShake = { magnitude: number; duration: number; };

type VolcanicPhysicsState = {
    terrain: TerrainPoint[];
    smoke: PhysicsSmokeParticle[];
    meteors: Meteor[];
    explosions: ExplosionParticle[];
    shockwaves: Shockwave[];
    wind: { x: number; y: number; };
    screenShake: ScreenShake;
};

type AnimatedElements = Star[] | Leaf[] | DustMote[] | VolcanicPhysicsState;

const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ theme }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bloomCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const elementsRef = useRef<AnimatedElements>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        if (!bloomCanvasRef.current) {
            bloomCanvasRef.current = document.createElement('canvas');
        }
        const bloomCanvas = bloomCanvasRef.current;
        const bloomContext = bloomCanvas.getContext('2d');
        if (!bloomContext) return;
        
        const container = canvas.parentElement as HTMLElement;
        if (!container) return;

        const resizeCanvas = () => {
            const { width, height } = container.getBoundingClientRect();
             if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                bloomCanvas.width = width;
                bloomCanvas.height = height;
            }
        };

        resizeCanvas();

        const generateTerrain = (width: number, height: number, detail: number): TerrainPoint[] => {
            const points: TerrainPoint[] = [];
            const roughness = 0.6;
            
            let p1 = { x: 0, y: height * (0.6 + Math.random() * 0.2) };
            let p2 = { x: width, y: height * (0.6 + Math.random() * 0.2) };
            
            const segments = [p1, p2];

            for (let i = 0; i < detail; i++) {
                for (let j = segments.length - 2; j >= 0; j--) {
                    const pt1 = segments[j];
                    const pt2 = segments[j+1];
                    const midX = (pt1.x + pt2.x) / 2;
                    const midY = (pt1.y + pt2.y) / 2;
                    const displacement = (Math.random() - 0.5) * (pt2.x - pt1.x) * roughness;
                    
                    segments.splice(j + 1, 0, {
                        x: midX,
                        y: midY + displacement
                    });
                }
            }

            // Smoothing pass
             const smoothedPoints = [segments[0]];
            for (let i = 1; i < segments.length - 1; i++) {
                const avgY = (segments[i-1].y + segments[i].y + segments[i+1].y) / 3;
                smoothedPoints.push({ x: segments[i].x, y: Math.max(height * 0.4, Math.min(height * 0.95, avgY)) });
            }
            smoothedPoints.push(segments[segments.length - 1]);

            return smoothedPoints;
        };

        const setupTheme = () => {
             switch (theme) {
                case 'SPACE':
                    const stars: Star[] = [];
                    for (let i = 0; i < 150; i++) {
                        stars.push({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height,
                            radius: Math.random() * 1.5,
                            alpha: 0.5 + Math.random() * 0.5,
                            twinkleSpeed: Math.random() * 0.02
                        });
                    }
                    elementsRef.current = stars;
                    break;
                case 'FOREST':
                    const leaves: Leaf[] = [];
                    for (let i = 0; i < 50; i++) {
                         leaves.push({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height,
                            size: 5 + Math.random() * 5,
                            speed: 0.5 + Math.random() * 0.5,
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.02
                         });
                    }
                    elementsRef.current = leaves;
                    break;
                case 'VOLCANIC':
                    elementsRef.current = {
                        terrain: generateTerrain(canvas.width, canvas.height, 8),
                        smoke: [],
                        meteors: [],
                        explosions: [],
                        shockwaves: [],
                        wind: { x: (Math.random() - 0.5) * 0.15, y: -0.01 }, // Sideways wind, slight updraft
                        screenShake: { magnitude: 0, duration: 0 },
                    } as VolcanicPhysicsState;
                    break;
                case 'WASTELAND':
                     const dustMotes: DustMote[] = [];
                    for (let i = 0; i < 80; i++) {
                        dustMotes.push({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height,
                            radius: Math.random() * 2,
                            speedX: (Math.random() - 0.5) * 0.3,
                            speedY: (Math.random() - 0.5) * 0.3,
                            alpha: Math.random() * 0.4
                        });
                    }
                    elementsRef.current = dustMotes;
                    break;
            }
        };

        setupTheme();
        
        let animationFrameId: number;
        let frameCount = 0;

        const draw = () => {
            resizeCanvas();
            context.clearRect(0, 0, canvas.width, canvas.height);
            bloomContext.clearRect(0, 0, canvas.width, canvas.height);
            frameCount++;

            switch (theme) {
                case 'SPACE':
                    drawSpace(context, frameCount);
                    break;
                case 'FOREST':
                    drawForest(context, frameCount);
                    break;
                case 'VOLCANIC':
                    drawVolcanicPhysics(context, bloomContext, frameCount);
                    break;
                case 'WASTELAND':
                    drawWasteland(context, frameCount);
                    break;
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        const drawVolcanicPhysics = (ctx: CanvasRenderingContext2D, bloomCtx: CanvasRenderingContext2D, frame: number) => {
            const state = elementsRef.current as VolcanicPhysicsState;
            if (!state.terrain) return; // Not initialized yet

            const METEOR_GRAVITY = 0.08;

            // --- HELPERS ---
            const getTerrainHeight = (x: number): number => {
                if (state.terrain.length < 2) return canvas.height;
                for (let i = 0; i < state.terrain.length - 1; i++) {
                    const p1 = state.terrain[i];
                    const p2 = state.terrain[i + 1];
                    if (x >= p1.x && x <= p2.x) {
                        const ratio = (x - p1.x) / (p2.x - p1.x);
                        return p1.y + (p2.y - p1.y) * ratio;
                    }
                }
                return state.terrain[state.terrain.length - 1].y;
            };

            const deformTerrain = (impactX: number, impactRadius: number, impactDepth: number) => {
                state.terrain.forEach(p => {
                    const dist = Math.abs(p.x - impactX);
                    if (dist < impactRadius) {
                        const falloff = (impactRadius - dist) / impactRadius;
                        p.y += Math.cos((falloff - 0.5) * Math.PI) * impactDepth * -0.5 + impactDepth * 0.5;
                    }
                });
            };

            // --- PHYSICS & SPAWNING ---
            // Spawn Meteors
            if (Math.random() < 0.012) {
                state.meteors.push({ x: Math.random() * canvas.width, y: -20, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2, radius: 4 + Math.random() * 5 });
            }

            // Update Meteors & check for impact
            state.meteors = state.meteors.filter(meteor => {
                meteor.vy += METEOR_GRAVITY;
                meteor.x += meteor.vx;
                meteor.y += meteor.vy;

                const terrainY = getTerrainHeight(meteor.x);
                if (meteor.y > terrainY) {
                    state.screenShake = { magnitude: 15, duration: 20 };
                    deformTerrain(meteor.x, 60 + Math.random() * 40, 15 + Math.random() * 15);
                    state.shockwaves.push({ x: meteor.x, y: terrainY, radius: 0, life: 40, initialLife: 40, strength: 3 + Math.random() * 2 });
                    const color = `hsl(${Math.random() * 20 + 25}, 100%, 60%)`;
                    for (let i = 0; i < 60; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 1 + Math.random() * 6;
                        state.explosions.push({ x: meteor.x, y: terrainY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 2 + Math.random() * 3, life: 50 + Math.random() * 40, initialLife: 90, color });
                    }
                    return false;
                }
                return meteor.y < canvas.height + 20 && meteor.x > -20 && meteor.x < canvas.width + 20;
            });

            // Spawn Smoke from peaks
            if (frame % 4 === 0) {
                state.terrain.forEach((p, i) => {
                    if (i > 0 && i < state.terrain.length - 1 && p.y < state.terrain[i - 1].y && p.y < state.terrain[i + 1].y && Math.random() < 0.05) {
                        const life = 400 + Math.random() * 300;
                        state.smoke.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.2, vy: -0.3 - Math.random() * 0.3, radius: 8 + Math.random() * 8, life, initialLife: life });
                    }
                });
            }

            // Update Smoke
            state.smoke.forEach(p => {
                p.life--;
                p.vy -= 0.003; // Buoyancy
                p.vx += state.wind.x; p.vy += state.wind.y;
                p.vx *= 0.97; p.vy *= 0.97;
                p.x += p.vx; p.y += p.vy;
                p.radius *= 0.998;
                const terrainY = getTerrainHeight(p.x);
                if (p.y > terrainY - p.radius) { p.y = terrainY - p.radius; p.vy *= -0.2; p.vx *= 0.8; }
                if (p.x < 0 || p.x > canvas.width) { p.vx *= -0.5; }
            });
            state.smoke = state.smoke.filter(p => p.life > 0 && p.radius > 1);

            // Update Shockwaves
            state.shockwaves.forEach(s => {
                s.life--; s.radius += 5; s.strength *= 0.96;
                state.smoke.forEach(p => {
                    const dx = p.x - s.x; const dy = p.y - s.y; const dist = Math.sqrt(dx * dx + dy * dy);
                    if (Math.abs(dist - s.radius) < 25) {
                        const force = s.strength / (dist + 1);
                        p.vx += (dx / dist) * force; p.vy += (dy / dist) * force;
                    }
                });
            });
            state.shockwaves = state.shockwaves.filter(s => s.life > 0);
            
            // Update Explosions
             state.explosions = state.explosions.filter(p => p.life > 0);
             state.explosions.forEach(p => { p.life--; p.vy += 0.09; p.vx *= 0.98; p.vy *= 0.98; p.x += p.vx; p.y += p.vy; });
            

            // --- RENDERING ---
            ctx.save();
            if (state.screenShake.duration > 0) {
                const { magnitude } = state.screenShake;
                ctx.translate(Math.random() * magnitude - magnitude / 2, Math.random() * magnitude - magnitude / 2);
                state.screenShake.duration--; state.screenShake.magnitude *= 0.95;
            }

            // Sky
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a0800'); gradient.addColorStop(0.5, '#3d0f00'); gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Meteors (drawn behind terrain)
            state.meteors.forEach(m => {
                const meteorColor = 'hsl(40, 100%, 80%)';
                const tailX = m.x - m.vx * 3;
                const tailY = m.y - m.vy * 3;

                // Tail (drawn only to bloom canvas for a glow effect)
                const tailGradient = bloomCtx.createLinearGradient(m.x, m.y, tailX, tailY);
                tailGradient.addColorStop(0, meteorColor);
                tailGradient.addColorStop(1, 'transparent');
                
                bloomCtx.strokeStyle = tailGradient;
                bloomCtx.lineWidth = m.radius * 1.5;
                bloomCtx.lineCap = 'round';
                bloomCtx.beginPath();
                bloomCtx.moveTo(m.x, m.y);
                bloomCtx.lineTo(tailX, tailY);
                bloomCtx.stroke();
                
                // Meteor head
                ctx.fillStyle = meteorColor;
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Also draw head to bloom canvas for a bright core
                bloomCtx.fillStyle = meteorColor;
                bloomCtx.beginPath();
                bloomCtx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                bloomCtx.fill();
            });

            // Terrain
            ctx.fillStyle = '#0a0505';
            ctx.strokeStyle = '#ff4d00';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(state.terrain[0].x, state.terrain[0].y);
            state.terrain.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fill();
            
            // Lava line on top of terrain
            bloomCtx.strokeStyle = '#ff8c00'; bloomCtx.lineWidth = 2;
            bloomCtx.beginPath();
            state.terrain.forEach(p => bloomCtx.lineTo(p.x, p.y + Math.sin(p.x * 0.1 + frame * 0.05) * 1.5));
            bloomCtx.stroke();
            
            // Smoke
            state.smoke.forEach(p => {
                const lifeRatio = p.life / p.initialLife;
                const alpha = Math.sin(lifeRatio * Math.PI) * 0.3;
                ctx.fillStyle = `rgba(30, 20, 20, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Explosions & Shockwaves
            state.explosions.forEach(p => {
                 const lifeRatio = p.life / p.initialLife;
                 ctx.globalAlpha = lifeRatio; bloomCtx.globalAlpha = lifeRatio;
                 ctx.fillStyle = p.color; bloomCtx.fillStyle = p.color;
                 ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); bloomCtx.fill();
            });
             ctx.globalAlpha = 1.0; bloomCtx.globalAlpha = 1.0;
            
            state.shockwaves.forEach(s => {
                const lifeRatio = s.life / s.initialLife;
                bloomCtx.strokeStyle = `rgba(255, 200, 100, ${lifeRatio * 0.8})`;
                bloomCtx.lineWidth = 3;
                bloomCtx.beginPath(); bloomCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); bloomCtx.stroke();
            });

            ctx.restore(); // Restore from screen shake
            
            // --- Apply Bloom ---
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.filter = 'blur(12px)'; ctx.drawImage(bloomCanvas, 0, 0);
            ctx.filter = 'blur(4px)'; ctx.drawImage(bloomCanvas, 0, 0);
            ctx.restore();
        };

        const drawSpace = (ctx: CanvasRenderingContext2D, frame: number) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#0c0a18'); gradient.addColorStop(1, '#2a2a3e');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const nebulaX = canvas.width / 2 + Math.sin(frame * 0.0005) * 50;
            const nebulaY = canvas.height / 2 + Math.cos(frame * 0.0007) * 30;
            const nebulaGradient = ctx.createRadialGradient(nebulaX, nebulaY, 50, nebulaX, nebulaY, 300);
            nebulaGradient.addColorStop(0, 'rgba(126, 87, 194, 0.2)'); nebulaGradient.addColorStop(1, 'rgba(69, 90, 100, 0)');
            ctx.fillStyle = nebulaGradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
            (elementsRef.current as Star[]).forEach(star => {
                const alpha = star.alpha + Math.sin(frame * star.twinkleSpeed) * 0.3;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.2, Math.min(1, alpha))})`;
                ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
            });
        };

        const drawForest = (ctx: CanvasRenderingContext2D, frame: number) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a2a1a'); gradient.addColorStop(1, '#0a1a0a');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawTreeLayer(ctx, frame, 3, 40, '#051005'); drawTreeLayer(ctx, frame, 2, 60, '#081808'); drawTreeLayer(ctx, frame, 1, 80, '#0c200c');
            (elementsRef.current as Leaf[]).forEach(leaf => {
                leaf.y += leaf.speed; leaf.x += Math.sin(leaf.y / 20) * 0.3; leaf.rotation += leaf.rotationSpeed;
                if (leaf.y > canvas.height) { leaf.y = -10; leaf.x = Math.random() * canvas.width; }
                ctx.save(); ctx.translate(leaf.x, leaf.y); ctx.rotate(leaf.rotation);
                ctx.fillStyle = 'rgba(106, 178, 106, 0.7)'; ctx.fillRect(-leaf.size / 2, -leaf.size / 2, leaf.size, leaf.size);
                ctx.restore();
            });
        };
        
        const drawTreeLayer = (ctx: CanvasRenderingContext2D, frame: number, layer: number, size: number, color: string) => {
            const speed = layer * 0.05;
            const offset = (frame * speed) % (canvas.width / 2);
            ctx.fillStyle = color;
            for (let i = -1; i < 4; i++) {
                const x = i * (canvas.width / 2) - offset;
                ctx.beginPath(); ctx.moveTo(x, canvas.height); ctx.lineTo(x + size * 1.5, canvas.height - size * 3); ctx.lineTo(x + size * 3, canvas.height); ctx.fill();
            }
        };

         const drawWasteland = (ctx: CanvasRenderingContext2D, frame: number) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#b06d34'); gradient.addColorStop(0.7, '#8c5220'); gradient.addColorStop(1, '#4a2c11');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
            for (let i = 0; i < 30; i++) {
                ctx.beginPath(); ctx.moveTo(Math.random() * canvas.width, canvas.height * 0.8 + Math.random() * canvas.height * 0.2);
                ctx.lineTo(Math.random() * canvas.width, canvas.height * 0.8 + Math.random() * canvas.height * 0.2); ctx.stroke();
            }
             (elementsRef.current as DustMote[]).forEach(mote => {
                mote.x += mote.speedX; mote.y += mote.speedY;
                if (mote.x < 0 || mote.x > canvas.width) mote.speedX *= -1;
                if (mote.y < 0 || mote.y > canvas.height) mote.speedY *= -1;
                ctx.fillStyle = `rgba(255, 229, 180, ${mote.alpha})`; ctx.beginPath(); ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2); ctx.fill();
             });
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />;
};

export default BackgroundCanvas;