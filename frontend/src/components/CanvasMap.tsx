import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Entity } from '../App';

interface CanvasMapProps {
  mapUrl: string;
  gridSize?: number;
  entities: Entity[];
  role: 'DM' | 'PLAYER';
  fogGrid: boolean[][];
  isFogMode: boolean;
  fogTool: 'reveal' | 'hide';
  activeTurnId: number | null; 
  onFogUpdate: (x: number, y: number, shouldReveal: boolean) => void;
  onMoveToken: (id: number, x: number, y: number) => void;
  onAddToken?: (type: string, x: number, y: number) => void; 
  onRotateToken: (id: number, angle: number) => void;
  onResizeToken: (id: number, size: number) => void;
  onTokenDoubleClick: (entity: Entity) => void;
  targetEntityIds: number[]; 
  attackerId: number | null;
  onSetTarget: (id: number | number[] | null, multiSelect?: boolean) => void;
  onSetAttacker: (id: number | null) => void;
  onFlipToken: (id: number) => void; 
  activeAoE: 'circle' | 'cone' | 'cube' | null;
  onAoEComplete: () => void;
  aoeColor: string;
  onSelectEntity: (entity: Entity, x: number, y: number) => void;

  // --- NOVAS PROPS DE SINCRONIA ---
  externalOffset?: { x: number, y: number };
  externalScale?: number;
  onMapChange?: (offset: { x: number, y: number }, scale: number) => void;
}

interface FloatingText {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
}

const CONDITIONS_ICONS: Record<string, string> = {
    'poison': '☠️', 'fire': '🔥', 'stun': '💫', 'shield': '🛡️', 
    'blood': '🩸', 'sleep': '💤', 'web': '🕸️'
};

const CanvasMap: React.FC<CanvasMapProps> = ({ 
  mapUrl, gridSize = 70, 
  entities, role, fogGrid, isFogMode, fogTool, activeTurnId,
  onFogUpdate, onMoveToken, onAddToken, onRotateToken, onResizeToken,
  onTokenDoubleClick, targetEntityIds, attackerId, onSetTarget, onSetAttacker,
  onFlipToken, activeAoE, onAoEComplete, aoeColor,
  onSelectEntity,
  
  // Recebendo as novas props
  externalOffset, externalScale, onMapChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); 
  const [scale, setScale] = useState(1); 
  
  // --- SINCRONIA: Jogador obedece ao Mestre ---
  useEffect(() => {
    if (role === 'PLAYER' && externalOffset && externalScale) {
        setOffset(externalOffset);
        setScale(externalScale);
    }
  }, [externalOffset, externalScale, role]);

  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [draggingEntityId, setDraggingEntityId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPaintingFog, setIsPaintingFog] = useState(false);
  const [tokenImages, setTokenImages] = useState<Record<string, HTMLImageElement>>({});
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const [measureStart, setMeasureStart] = useState<{x: number, y: number} | null>(null);
  const [aoeStart, setAoeStart] = useState<{x: number, y: number} | null>(null);

  const isMKeyPressed = useRef(false);
  const currentMousePosRef = useRef({ x: 0, y: 0 });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const prevEntitiesRef = useRef<Record<number, number>>({}); 

  useEffect(() => { const img = new Image(); img.src = mapUrl; img.onload = () => setMapImage(img); }, [mapUrl]);
  
  useEffect(() => { 
    entities.forEach(ent => { 
        if (ent.image && !tokenImages[ent.image]) { 
            const img = new Image(); 
            img.src = ent.image; 
            img.onload = () => setTokenImages(prev => ({ ...prev, [ent.image!]: img })); 
        } 
    }); 
  }, [entities, tokenImages]);

  // EVENTOS DE TECLADO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if (key === 'm') isMKeyPressed.current = true;
      if (key === 'f') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const worldX = (currentMousePosRef.current.x - rect.left - offset.x) / scale;
        const worldY = (currentMousePosRef.current.y - rect.top - offset.y) / scale;
        const hovered = entities.find(ent => {
          const s = (ent.size || 1) * gridSize;
          return worldX >= ent.x * gridSize && worldX <= ent.x * gridSize + s &&
                 worldY >= ent.y * gridSize && worldY <= ent.y * gridSize + s;
        });
        if (hovered) onFlipToken(hovered.id);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() === 'm') isMKeyPressed.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [entities, offset, scale, gridSize, onFlipToken]);

  // TEXTOS FLUTUANTES
  useEffect(() => {
    entities.forEach(ent => {
        const prevHp = prevEntitiesRef.current[ent.id];
        if (prevHp !== undefined && prevHp !== ent.hp) {
            const diff = ent.hp - prevHp;
            const text = diff > 0 ? `+${diff}` : `${diff}`;
            const color = diff > 0 ? '#4ade80' : '#ef4444'; 
            setFloatingTexts(prev => [...prev, { 
                id: Math.random().toString(), 
                x: ent.x * gridSize + (gridSize * (ent.size || 1)) / 2, 
                y: ent.y * gridSize, text, color, life: 60, maxLife: 60 
            }]);
        }
        prevEntitiesRef.current[ent.id] = ent.hp;
    });
  }, [entities, gridSize]);

  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const interval = setInterval(() => {
        setFloatingTexts(prev => prev.map(ft => ({ ...ft, life: ft.life - 1, y: ft.y - 0.5 })).filter(ft => ft.life > 0));
    }, 16); 
    return () => clearInterval(interval);
  }, [floatingTexts.length]);

  const drawToken = useCallback((ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number, size: number, images: Record<string, HTMLImageElement>) => {
    const tokenImage = entity.image ? images[entity.image] : null; 
    const isDead = entity.hp <= 0;
    
    if (entity.id === activeTurnId) {
        ctx.save();
        const pulse = Math.sin(Date.now() / 500) * 5 + 5;
        ctx.shadowColor = "#fbbf24"; 
        ctx.shadowBlur = 20 + pulse;
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x + size / 2, y + size / 2, size / 1.7 + pulse/5, size / 1.7 + pulse/5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.beginPath(); ctx.ellipse(x + size / 2, y + size - 5, size / 2.5, size / 5, 0, 0, Math.PI * 2); ctx.fill();
    
    const isAttacker = entity.id === attackerId; 
    const isTarget = targetEntityIds.includes(entity.id);
    if (isAttacker || isTarget) {
        ctx.lineWidth = 3 / scale; 
        ctx.strokeStyle = isAttacker ? "#3b82f6" : "#ef4444";
        ctx.shadowColor = ctx.strokeStyle; 
        ctx.shadowBlur = 15; 
        ctx.beginPath(); ctx.ellipse(x + size / 2, y + size / 2, size / 1.8, size / 1.8, 0, 0, Math.PI * 2); ctx.stroke();
    }

    if (tokenImage) {
      ctx.save(); 
      ctx.translate(x + size / 2, y + size / 2); 
      ctx.rotate(((entity.rotation || 0) * Math.PI) / 180);
      if (entity.mirrored) ctx.scale(-1, 1);
      if (isDead) { ctx.filter = 'grayscale(100%) brightness(50%) contrast(120%)'; ctx.globalAlpha = 0.8; }
      ctx.drawImage(tokenImage, -size / 2, -size / 2, size, size); 
      ctx.restore(); 
      if (isDead) {
          ctx.save(); ctx.translate(x + size / 2, y + size / 2); ctx.font = `${size / 1.5}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("💀", 0, -10); ctx.restore();
      }
    } else {
      ctx.fillStyle = isDead ? '#4b5563' : entity.color; ctx.beginPath(); ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI*2); ctx.fill();
      if (isDead) { ctx.fillStyle = "white"; ctx.font = `${size / 2}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("💀", x + size / 2, y + size / 2); }
    }
    
    ctx.restore(); ctx.fillStyle = "white"; ctx.font = `bold ${12 / scale}px sans-serif`; ctx.textAlign = "center"; ctx.shadowColor = "black"; ctx.shadowBlur = 4;
    ctx.fillText(entity.name, x + size/2, y + size + (14 / scale));

    if (!isDead && entity.conditions && entity.conditions.length > 0) {
        const iconSize = size / 3.5;
        entity.conditions.forEach((cond, index) => {
            const icon = CONDITIONS_ICONS[cond] || '❓';
            ctx.font = `${iconSize}px sans-serif`; ctx.textAlign = "center"; 
            ctx.fillText(icon, (x + size/2) - (entity.conditions.length * iconSize / 2) + (index * iconSize) + (iconSize / 2), y + size + (28 / scale));
        });
    }
  }, [scale, activeTurnId, targetEntityIds, attackerId]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !mapImage) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); 
    ctx.translate(offset.x, offset.y); 
    ctx.scale(scale, scale);
    
    ctx.drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);

    [...entities].sort((a, b) => a.y - b.y).forEach(ent => {
        const tokenScale = ent.size || 1;
        const actualSize = gridSize * tokenScale;
        let dx = ent.x * gridSize; 
        let dy = ent.y * gridSize;
        if (ent.id === draggingEntityId) { 
            dx = (mousePos.x - offset.x)/scale - actualSize/2; 
            dy = (mousePos.y - offset.y)/scale - actualSize/2; 
        }
        drawToken(ctx, ent, dx, dy, actualSize, tokenImages);
    });

    if (fogGrid) {
      ctx.fillStyle = "#000000"; 
      ctx.globalAlpha = role === 'DM' ? 0.6 : 1.0; 
      fogGrid.forEach((row, y) => {
        row.forEach((isRevealed, x) => {
          if (!isRevealed) { ctx.fillRect(x * gridSize, y * gridSize, gridSize + 1, gridSize + 1); }
        });
      });
      ctx.globalAlpha = 1.0; 
    }

    if (aoeStart && activeAoE) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mX = (currentMousePosRef.current.x - rect.left - offset.x) / scale;
        const mY = (currentMousePosRef.current.y - rect.top - offset.y) / scale;
        const radius = Math.hypot(mX - aoeStart.x, mY - aoeStart.y);
        ctx.save();
        ctx.fillStyle = aoeColor + "33"; 
        ctx.strokeStyle = aoeColor;
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        if (activeAoE === 'circle') ctx.arc(aoeStart.x, aoeStart.y, radius, 0, Math.PI * 2);
        else ctx.rect(aoeStart.x - radius, aoeStart.y - radius, radius * 2, radius * 2); 
        ctx.fill(); ctx.stroke();
        const distMeters = (radius / gridSize) * 1.5;
        ctx.font = `bold ${14 / scale}px sans-serif`; ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.fillText(`${distMeters.toFixed(1)}m`, aoeStart.x, aoeStart.y - (10/scale));
        ctx.restore();
    }

    if (measureStart) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mX = (currentMousePosRef.current.x - rect.left - offset.x) / scale;
        const mY = (currentMousePosRef.current.y - rect.top - offset.y) / scale;
        ctx.beginPath(); ctx.moveTo(measureStart.x, measureStart.y); ctx.lineTo(mX, mY);
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3 / scale; ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([]); 
        const dist = (Math.hypot(mX - measureStart.x, mY - measureStart.y) / gridSize) * 1.5;
        ctx.font = `bold ${16 / scale}px sans-serif`; ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center";
        ctx.fillText(`${dist.toFixed(1)}m`, (measureStart.x+mX)/2, (measureStart.y+mY)/2);
    }

    floatingTexts.forEach(ft => {
        ctx.save(); ctx.globalAlpha = ft.life / 20; ctx.fillStyle = ft.color; ctx.font = `bold ${24 / scale}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    });

    ctx.restore();
  }, [mapImage, entities, offset, scale, draggingEntityId, mousePos, gridSize, tokenImages, drawToken, fogGrid, role, targetEntityIds, attackerId, measureStart, aoeStart, activeAoE, floatingTexts, aoeColor, activeTurnId]);

  const handleWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - offset.x) / scale;
    const worldY = (e.clientY - rect.top - offset.y) / scale;

    if (e.altKey) {
        const hoveredEntity = entities.find(ent => {
            const ts = ent.size || 1;
            return worldX >= ent.x*gridSize && worldX <= ent.x*gridSize + gridSize*ts && worldY >= ent.y*gridSize && worldY <= ent.y*gridSize + gridSize*ts;
        });
        if (hoveredEntity) {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            onResizeToken(hoveredEntity.id, parseFloat(Math.max(0.1, (hoveredEntity.size || 1) + delta).toFixed(1)));
            return;
        }
    }
    if (e.shiftKey) {
        const hoveredEntity = entities.find(ent => {
            const ts = ent.size || 1;
            return worldX >= ent.x*gridSize && worldX <= ent.x*gridSize + gridSize*ts && worldY >= ent.y*gridSize && worldY <= ent.y*gridSize + gridSize*ts;
        });
        if (hoveredEntity) { onRotateToken(hoveredEntity.id, (hoveredEntity.rotation || 0) + (e.deltaY > 0 ? 15 : -15)); return; }
    }

    // ZOOM CONTROLADO
    const newScale = Math.min(Math.max(0.1, scale - e.deltaY * 0.001), 5);
    setScale(newScale);
    
    // --- ENVIA PARA O SERVER SE FOR MESTRE ---
    if (role === 'DM' && onMapChange) {
        onMapChange(offset, newScale);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = (clickX - offset.x) / scale;
    const worldY = (clickY - offset.y) / scale;

    if (isMKeyPressed.current) { setMeasureStart({ x: worldX, y: worldY }); return; }
    if (activeAoE) { setAoeStart({ x: worldX, y: worldY }); return; }
    if (isFogMode) { onFogUpdate(Math.floor(worldX/gridSize), Math.floor(worldY/gridSize), fogTool === 'reveal'); setIsPaintingFog(true); return; }

    let tokenClicked = false;
    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i];
      const ts = ent.size || 1;
      if (worldX >= ent.x*gridSize && worldX <= ent.x*gridSize + ts*gridSize && worldY >= ent.y*gridSize && worldY <= ent.y*gridSize + ts*gridSize) {
        if (e.altKey) onSetTarget(ent.id, e.shiftKey); else onSetAttacker(ent.id);
        setDraggingEntityId(ent.id); setMousePos({ x: clickX, y: clickY });
        tokenClicked = true; return;
      }
    }
    if (!tokenClicked) { 
        if (e.ctrlKey) { setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY }); }
        if (!e.shiftKey && !e.altKey) { onSetTarget(null); onSetAttacker(null); }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    currentMousePosRef.current = { x: e.clientX, y: e.clientY };
    const rect = canvasRef.current!.getBoundingClientRect();
    const curX = e.clientX - rect.left; const curY = e.clientY - rect.top;
    if (draggingEntityId !== null || measureStart || aoeStart) setMousePos({ x: curX, y: curY }); 

    if (isFogMode && isPaintingFog) {
        const worldX = (curX - offset.x) / scale; const worldY = (curY - offset.y) / scale;
        onFogUpdate(Math.floor(worldX/gridSize), Math.floor(worldY/gridSize), fogTool === 'reveal');
    }
    if (isPanning) {
        const newOffset = { x: offset.x + (e.clientX - lastMousePos.x), y: offset.y + (e.clientY - lastMousePos.y) };
        setOffset(newOffset);
        setLastMousePos({ x: e.clientX, y: e.clientY });

        // --- ENVIA PARA O SERVER SE FOR MESTRE ---
        if (role === 'DM' && onMapChange) {
            onMapChange(newOffset, scale);
        }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (aoeStart && activeAoE) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const wX = (e.clientX - rect.left - offset.x) / scale;
        const wY = (e.clientY - rect.top - offset.y) / scale;
        const radius = Math.hypot(wX - aoeStart.x, wY - aoeStart.y);
        const hits = entities.filter(ent => {
            const ts = ent.size || 1;
            const cX = ent.x * gridSize + (ts * gridSize) / 2;
            const cY = ent.y * gridSize + (ts * gridSize) / 2;
            return Math.hypot(cX - aoeStart.x, cY - aoeStart.y) <= radius;
        });
        if(hits.length > 0) onSetTarget(hits.map(h => h.id), e.shiftKey);
        setAoeStart(null); onAoEComplete();
    }
    if (draggingEntityId !== null) { 
        const rect = canvasRef.current!.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - offset.x) / scale;
        const worldY = (e.clientY - rect.top - offset.y) / scale;
        onMoveToken(draggingEntityId, Math.floor(worldX/gridSize), Math.floor(worldY/gridSize)); 
        setDraggingEntityId(null); 
    }
    setMeasureStart(null); setIsPanning(false); setIsPaintingFog(false);
  };

  return (
    <div className="w-full h-full bg-[#1a1a1a] overflow-hidden flex items-center justify-center relative">
      <canvas 
        ref={canvasRef} width={1920} height={1080} 
        className={`shadow-2xl ${isFogMode ? 'cursor-cell' : (measureStart || activeAoE) ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} 
        onMouseLeave={() => { setDraggingEntityId(null); setIsPanning(false); setIsPaintingFog(false); setMeasureStart(null); setAoeStart(null); }} 
        onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()} 
        onDoubleClick={(e) => {
            const rect = canvasRef.current!.getBoundingClientRect();
            const wX = (e.clientX - rect.left - offset.x) / scale;
            const wY = (e.clientY - rect.top - offset.y) / scale;
            const ent = entities.find(en => {
                const ts = en.size || 1;
                return wX >= en.x*gridSize && wX <= en.x*gridSize + ts*gridSize && wY >= en.y*gridSize && wY <= en.y*gridSize + ts*gridSize;
            });
            if (ent) { if (e.altKey) onSelectEntity(ent, e.clientX, e.clientY); else onTokenDoubleClick(ent); }
        }}
      />
      
      {/* EXIBIR ATALHOS APENAS SE FOR MESTRE (DM) */}
      <div className="absolute top-4 right-4 pointer-events-none text-white/20 text-xs font-mono text-right">
        {isFogMode ? <span className="text-yellow-400 font-bold">NEBLINA: {fogTool === 'reveal' ? 'REVELAR' : 'ESCONDER'}</span> : (
          role === 'DM' && ( // SÓ EXIBE SE FOR DM
            <>
              <div>ZOOM: {scale.toFixed(2)}x</div>
              <div className="text-yellow-400 font-bold mt-1">RÉGUA: SEGURE 'M' + ARRASTAR</div>
              <div className="text-yellow-400 font-bold mt-1">MAPA: CTRL + ARRASTAR</div>
              <div className="text-yellow-400 font-bold mt-1">GIRAR: SHIFT + SCROLL</div>
              <div className="text-yellow-400 font-bold mt-1">REDIMENSIONAR: ALT + SCROLL</div>
              <div className="text-yellow-400 font-bold mt-1">VIRAR TOKEN: SELECIONE É APERTE F</div>
              <div className="text-yellow-400 font-bold mt-1">STATUS BAR: ALT + DOUBLE CLICK</div>
            </>
          )
        )}
      </div>
    </div>
  );
};
export default CanvasMap;