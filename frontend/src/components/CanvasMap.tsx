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
  onTokenDoubleClick: (entity: Entity) => void;
  targetEntityIds: number[]; 
  attackerId: number | null;
  onSetTarget: (id: number | null, multiSelect?: boolean) => void;
  onSetAttacker: (id: number | null) => void;
  onFlipToken: (id: number) => void; 
  
  // --- NOVO: PROPS DE AOE ---
  activeAoE: 'circle' | 'cone' | 'cube' | null;
  onAoEComplete: () => void;
}

// Ícones de Condição
const CONDITIONS_ICONS: Record<string, string> = {
    'poison': '☠️', 'fire': '🔥', 'stun': '💫', 'shield': '🛡️', 
    'blood': '🩸', 'sleep': '💤', 'web': '🕸️'
};

const CanvasMap: React.FC<CanvasMapProps> = ({ 
  mapUrl, gridSize = 50, entities, role, fogGrid, isFogMode, fogTool, activeTurnId,
  onFogUpdate, onMoveToken, onAddToken, onRotateToken,
  onTokenDoubleClick, targetEntityIds, attackerId, onSetTarget, onSetAttacker,
  onFlipToken,
  activeAoE, onAoEComplete // Props novas
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); 
  const [scale, setScale] = useState(1); 
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [draggingEntityId, setDraggingEntityId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPaintingFog, setIsPaintingFog] = useState(false);
  const [tokenImages, setTokenImages] = useState<Record<string, HTMLImageElement>>({});
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // --- ESTADOS DE FERRAMENTAS ---
  const [measureStart, setMeasureStart] = useState<{x: number, y: number} | null>(null);
  const [aoeStart, setAoeStart] = useState<{x: number, y: number} | null>(null); // Ponto de início do AoE

  const isMKeyPressed = useRef(false);
  const currentMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.src = mapUrl;
    img.onload = () => setMapImage(img);
  }, [mapUrl]);

  useEffect(() => {
    entities.forEach(ent => {
      if (ent.image && !tokenImages[ent.image]) {
        const img = new Image();
        img.src = ent.image;
        img.onload = () => setTokenImages(prev => ({ ...prev, [ent.image!]: img }));
      }
    });
  }, [entities, tokenImages]);

  // Ouvintes de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'm') isMKeyPressed.current = true;
        if (e.key.toLowerCase() === 'f') {
            const rect = canvasRef.current!.getBoundingClientRect();
            const mouseX = currentMousePosRef.current.x - rect.left;
            const mouseY = currentMousePosRef.current.y - rect.top;
            const worldX = (mouseX - offset.x) / scale;
            const worldY = (mouseY - offset.y) / scale;
            const hoveredEntity = entities.find(ent => {
                const entX = ent.x * gridSize;
                const entY = ent.y * gridSize;
                return worldX >= entX && worldX <= entX + gridSize && worldY >= entY && worldY <= entY + gridSize;
            });
            if (hoveredEntity) onFlipToken(hoveredEntity.id);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'm') {
            isMKeyPressed.current = false;
            setMeasureStart(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [entities, gridSize, offset, scale, onFlipToken]);

  const drawToken = useCallback((ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number, size: number, images: Record<string, HTMLImageElement>) => {
    const tokenImage = entity.image ? images[entity.image] : null;
    const TOKEN_SCALE = 2.0; 
    const isDead = entity.hp <= 0;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size - 5, size / 2.5, size / 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';

    if (entity.id === activeTurnId) {
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 20;
    }

    const isAttacker = entity.id === attackerId;
    const isTarget = targetEntityIds.includes(entity.id);

    if (isAttacker || isTarget) {
        ctx.lineWidth = 3 / scale;
        if (isAttacker) {
            ctx.shadowColor = "#3b82f6"; ctx.strokeStyle = "#3b82f6";
        } else {
            ctx.shadowColor = "#ef4444"; ctx.strokeStyle = "#ef4444";
        }
        ctx.shadowBlur = 15;
        ctx.beginPath();
        const ringSize = isAttacker ? size / 1.6 : size / 1.8;
        ctx.ellipse(x + size / 2, y + size / 2, ringSize, ringSize, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (tokenImage) {
      const imgWidth = size * TOKEN_SCALE;
      const imgHeight = size * TOKEN_SCALE;
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      ctx.save(); 
      ctx.translate(centerX, centerY);
      ctx.rotate(((entity.rotation || 0) * Math.PI) / 180);
      if (entity.mirrored) ctx.scale(-1, 1);
      ctx.translate(-centerX, -centerY);
      if (isDead) { ctx.filter = 'grayscale(100%) brightness(50%) contrast(120%)'; ctx.globalAlpha = 0.8; }
      ctx.drawImage(tokenImage, centerX - (imgWidth / 2), centerY - (imgHeight / 2) - 10, imgWidth, imgHeight);
      ctx.restore(); 
      if (isDead) {
          ctx.save(); ctx.translate(centerX, centerY); ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = `${size / 1.5}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.shadowColor = "black"; ctx.shadowBlur = 10; ctx.fillText("💀", 0, -10); ctx.restore();
      }
    } else {
      ctx.fillStyle = isDead ? '#4b5563' : entity.color;
      ctx.beginPath(); ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI*2); ctx.fill();
      if (isDead) {
          ctx.fillStyle = "white"; ctx.font = `${size / 2}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("💀", x + size / 2, y + size / 2);
      }
    }
    
    // Nome do Token
    ctx.shadowBlur = 0;
    ctx.restore(); 
    ctx.fillStyle = isDead ? "#9ca3af" : "white";
    ctx.font = `bold ${12 / scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.lineWidth = 3;
    ctx.strokeText(entity.name, x + size/2, y + size + (14 / scale));
    ctx.fillText(entity.name, x + size/2, y + size + (14 / scale));

    // Condições (Abaixo do nome)
    if (!isDead && entity.conditions && entity.conditions.length > 0) {
        const iconSize = size / 3.5;
        const startY = y + size + (28 / scale); 
        entity.conditions.forEach((cond, index) => {
            const icon = CONDITIONS_ICONS[cond] || '❓';
            ctx.font = `${iconSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top"; 
            ctx.shadowColor = "black";
            ctx.shadowBlur = 2;
            ctx.fillStyle = "white";
            const totalWidth = entity.conditions.length * iconSize;
            const startX = (x + size/2) - (totalWidth / 2) + (iconSize / 2);
            ctx.fillText(icon, startX + (index * iconSize), startY);
        });
    }
  }, [scale, activeTurnId, targetEntityIds, attackerId]); 

  // --- RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // 1. Mapa
    ctx.drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);
    
    // 2. Templates de Área (AoE) - Desenhados SOBRE o mapa, mas SOB (ou com transparência) os tokens
    if (aoeStart && activeAoE) {
        const rect = canvasRef.current!.getBoundingClientRect();
        // Mouse atual em coordenadas do mundo
        const mouseX = (currentMousePosRef.current.x - rect.left - offset.x) / scale;
        const mouseY = (currentMousePosRef.current.y - rect.top - offset.y) / scale;
        
        const radius = Math.hypot(mouseX - aoeStart.x, mouseY - aoeStart.y);

        ctx.fillStyle = "rgba(255, 0, 0, 0.2)"; // Vermelho transparente
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();

        if (activeAoE === 'circle') {
            ctx.arc(aoeStart.x, aoeStart.y, radius, 0, Math.PI * 2);
        } 
        else if (activeAoE === 'cube') {
            // Quadrado centrado no ponto inicial
            const size = radius * 2; // Raio vira metade do lado
            ctx.rect(aoeStart.x - radius, aoeStart.y - radius, size, size);
        } 
        else if (activeAoE === 'cone') {
            // Cone de 53 graus (padrão D&D 5e: largura = distância)
            const angle = Math.atan2(mouseY - aoeStart.y, mouseX - aoeStart.x);
            const spread = 53 * (Math.PI / 180) / 2; // Metade do ângulo total
            
            ctx.moveTo(aoeStart.x, aoeStart.y);
            ctx.lineTo(
                aoeStart.x + Math.cos(angle - spread) * radius, 
                aoeStart.y + Math.sin(angle - spread) * radius
            );
            ctx.arc(aoeStart.x, aoeStart.y, radius, angle - spread, angle + spread);
            ctx.lineTo(aoeStart.x, aoeStart.y);
        }

        ctx.fill();
        ctx.stroke();
    }

    // 3. Tokens
    const sortedEntities = [...entities].sort((a, b) => a.y - b.y);
    sortedEntities.forEach(entity => {
      let drawX = entity.x * gridSize;
      let drawY = entity.y * gridSize;
      if (entity.id === draggingEntityId) {
        drawX = ((mousePos.x - offset.x) / scale) - (gridSize / 2);
        drawY = ((mousePos.y - offset.y) / scale) - (gridSize / 2);
      }
      drawToken(ctx, entity, drawX, drawY, gridSize, tokenImages);
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

    // 4. Régua de Medição
    if (measureStart) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = (currentMousePosRef.current.x - rect.left - offset.x) / scale;
        const mouseY = (currentMousePosRef.current.y - rect.top - offset.y) / scale;

        ctx.beginPath();
        ctx.moveTo(measureStart.x, measureStart.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = "#fbbf24"; 
        ctx.lineWidth = 3 / scale;
        ctx.setLineDash([10, 5]); 
        ctx.stroke();
        ctx.setLineDash([]); 

        ctx.fillStyle = "#fbbf24";
        ctx.beginPath(); ctx.arc(measureStart.x, measureStart.y, 4/scale, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 4/scale, 0, Math.PI*2); ctx.fill();

        const distPixels = Math.hypot(mouseX - measureStart.x, mouseY - measureStart.y);
        const distMeters = (distPixels / gridSize) * 1.5;

        const midX = (measureStart.x + mouseX) / 2;
        const midY = (measureStart.y + mouseY) / 2;

        ctx.font = `bold ${16 / scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const text = `${distMeters.toFixed(1)}m`;
        const textMetrics = ctx.measureText(text);
        const padding = 4 / scale;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
            midX - textMetrics.width/2 - padding, 
            midY - (8/scale) - padding, 
            textMetrics.width + padding*2, 
            (16/scale) + padding*2
        );

        ctx.fillStyle = "#fbbf24";
        ctx.fillText(text, midX, midY);
    }

    ctx.restore();
  }, [mapImage, entities, offset, scale, draggingEntityId, mousePos, gridSize, tokenImages, drawToken, fogGrid, role, targetEntityIds, attackerId, measureStart, aoeStart, activeAoE]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.shiftKey) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - offset.x) / scale;
        const worldY = (mouseY - offset.y) / scale;

        const hoveredEntity = entities.find(ent => {
            const entX = ent.x * gridSize;
            const entY = ent.y * gridSize;
            return worldX >= entX && worldX <= entX + gridSize && worldY >= entY && worldY <= entY + gridSize;
        });

        if (hoveredEntity) {
            const rotationStep = 15;
            const direction = e.deltaY > 0 ? 1 : -1;
            const newRotation = (hoveredEntity.rotation || 0) + (direction * rotationStep);
            onRotateToken(hoveredEntity.id, newRotation);
            return; 
        }
    }

    const zoomIntensity = 0.001;
    const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomIntensity), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = (clickX - offset.x) / scale;
    const worldY = (clickY - offset.y) / scale;

    // --- REGUA (M) ---
    if (isMKeyPressed.current) {
        setMeasureStart({ x: worldX, y: worldY });
        return; 
    }

    // --- AOE (TEMPLATES) ---
    if (activeAoE) {
        setAoeStart({ x: worldX, y: worldY });
        return; // Não seleciona tokens se estiver desenhando área
    }

    if (isFogMode) {
      const gridX = Math.floor(worldX / gridSize);
      const gridY = Math.floor(worldY / gridSize);
      let shouldReveal = fogTool === 'reveal';
      if (e.ctrlKey) shouldReveal = !shouldReveal; 
      onFogUpdate(gridX, gridY, shouldReveal);
      setIsPaintingFog(true); 
      return; 
    }

    let tokenClicked = false;
    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i];
      const entX = ent.x * gridSize;
      const entY = ent.y * gridSize;
      if (worldX >= entX && worldX <= entX + gridSize && worldY >= entY && worldY <= entY + gridSize) {
        
        if (e.altKey) {
            onSetAttacker(ent.id);
        } else {
            onSetTarget(ent.id, e.shiftKey);
        }
        
        setDraggingEntityId(ent.id);
        setMousePos({ x: clickX, y: clickY });
        tokenClicked = true;
        return;
      }
    }
    
    if (!tokenClicked) { 
        if (e.ctrlKey) {
            setIsPanning(true); 
            setLastMousePos({ x: e.clientX, y: e.clientY }); 
        }
        if (!e.shiftKey && !e.altKey) {
            onSetTarget(null);
            onSetAttacker(null);
        }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = (clickX - offset.x) / scale;
    const worldY = (clickY - offset.y) / scale;

    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i];
      const entX = ent.x * gridSize;
      const entY = ent.y * gridSize;
      if (worldX >= entX && worldX <= entX + gridSize && worldY >= entY && worldY <= entY + gridSize) {
        onTokenDoubleClick(ent); 
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    currentMousePosRef.current = { x: e.clientX, y: e.clientY };
    const clickX = e.clientX;
    const clickY = e.clientY;

    if (measureStart || aoeStart) { 
        setMousePos({ x: clickX, y: clickY }); 
        return; 
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const relClickX = e.clientX - rect.left;
    const relClickY = e.clientY - rect.top;

    if (isFogMode && isPaintingFog) {
      const worldX = (relClickX - offset.x) / scale;
      const worldY = (relClickY - offset.y) / scale;
      const gridX = Math.floor(worldX / gridSize);
      const gridY = Math.floor(worldY / gridSize);
      let shouldReveal = fogTool === 'reveal';
      if (e.ctrlKey) shouldReveal = !shouldReveal;
      onFogUpdate(gridX, gridY, shouldReveal);
      return;
    }
    if (draggingEntityId !== null) { setMousePos({ x: relClickX, y: relClickY }); return; }
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (measureStart) setMeasureStart(null);
    if (aoeStart) { setAoeStart(null); onAoEComplete(); } // Reseta a ferramenta ao soltar

    setIsPaintingFog(false); 
    if (draggingEntityId !== null) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const worldDropX = (dropX - offset.x) / scale;
      const worldDropY = (dropY - offset.y) / scale;
      const gridX = Math.floor(worldDropX / gridSize);
      const gridY = Math.floor(worldDropY / gridSize);
      onMoveToken(draggingEntityId, gridX, gridY);
      setDraggingEntityId(null);
    }
    setIsPanning(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("entityType"); 
    if (!type || !onAddToken) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;
    const worldDropX = (dropX - offset.x) / scale;
    const worldDropY = (dropY - offset.y) / scale;
    const gridX = Math.floor(worldDropX / gridSize);
    const gridY = Math.floor(worldDropY / gridSize);
    onAddToken(type, gridX, gridY);
  };

  return (
    <div className="w-full h-full bg-[#1a1a1a] overflow-hidden flex items-center justify-center relative" onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* Muda o cursor se estiver desenhando AoE */}
      <canvas ref={canvasRef} width={1920} height={1080} className={`shadow-2xl ${isFogMode ? 'cursor-cell' : (measureStart || activeAoE) ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { setDraggingEntityId(null); setIsPanning(false); setIsPaintingFog(false); setMeasureStart(null); setAoeStart(null); }} onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()} onDoubleClick={handleDoubleClick} />
      <div className="absolute top-4 right-4 pointer-events-none text-white/20 text-xs font-mono">
        {isFogMode ? <span className="text-yellow-400 font-bold">EDITANDO NEBLINA: {fogTool === 'reveal' ? 'REVELAR' : 'ESCONDER'}</span> : (
          <div className="text-right">
             <div>ZOOM: {scale.toFixed(2)}x</div>
             <div className="text-[10px] text-yellow-400 mt-1 font-bold">RÉGUA: SEGURE 'M' + ARRASTAR</div>
             <div className="text-[10px] text-gray-500">MOVER MAPA: CTRL + ARRASTAR</div>
             <div className="text-[10px] text-gray-500">GIRAR: SHIFT + SCROLL</div>
             <div className="text-[10px] text-gray-500">ESPELHAR: TECLA 'F'</div>
             <div className="text-[10px] text-blue-400 mt-1">ATACANTE: ALT + CLIQUE</div>
             <div className="text-[10px] text-red-400">ALVO(S): SHIFT + CLIQUE</div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CanvasMap;