// @ts-nocheck
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows, Stars, Sparkles } from '@react-three/drei';
import { DiceModel } from './DiceModel'; 
import * as THREE from 'three';
import { Howl } from 'howler';

// --- SONS ---
const rollSound = new Howl({ src: ['/sfx/dado.mp3'], volume: 0.5 });
const successSound = new Howl({ src: ['/sfx/levelup.mp3'], volume: 0.4 });

// --- ROTAÇÕES CALIBRADAS ---
const faceRotations: Record<number, [number, number, number]> = {
  20: [1.45, 0.00, 0.00], 19: [5.22, -5.28, -6.09], 18: [14.50, -10.43, 0.93],
  17: [3.45, 6.83, -4.09], 16: [5.02, -7.32, -10.36], 15: [12.83, -8.87, 0.93],
  14: [8.71, -9.43, -0.02], 13: [8.17, -8.40, -9.81], 12: [2.42, 0.03, 0.65],
  11: [8.74, -9.40, 2.48], 10: [2.42, -0.00, -0.60], 9:  [5.59, -6.28, -5.64],
  8:  [11.38, -14.71, 2.83], 7:  [15.10, -6.28, 3.13], 6:  [6.59, -6.83, -8.49],
  5:  [5.19, 4.14, -0.90], 4:  [3.51, 2.59, -0.95], 3:  [5.04, 8.40, -5.24],
  2:  [2.00, 0.98, 0.25], 1:  [4.49, -6.27, -6.34], 
};

// --- DADO ANIMADO ---
const SpinningDice = ({ isRolling, finalResult }: { isRolling: boolean, finalResult: number | null }) => {
  const diceRef = useRef<any>(null);
  const targetRotation = useRef<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    if (finalResult !== null) {
        if (faceRotations[finalResult]) targetRotation.current = faceRotations[finalResult];
        else targetRotation.current = [0, 0, 0];
    }
  }, [finalResult]);
  
  useFrame((state, delta) => {
    if (!diceRef.current) return;

    // Levitação suave constante
    diceRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.05; 

    if (isRolling) {
      // MODO ROLAGEM RÁPIDA
      diceRef.current.rotation.x += 15 * delta;
      diceRef.current.rotation.y += 12 * delta;
      diceRef.current.rotation.z += 8 * delta;
    } else if (finalResult !== null) {
      // MODO FREIO (Damping)
      diceRef.current.rotation.x = THREE.MathUtils.damp(diceRef.current.rotation.x, targetRotation.current[0], 4, delta);
      diceRef.current.rotation.y = THREE.MathUtils.damp(diceRef.current.rotation.y, targetRotation.current[1], 4, delta);
      diceRef.current.rotation.z = THREE.MathUtils.damp(diceRef.current.rotation.z, targetRotation.current[2], 4, delta);
    } else {
      // MODO IDLE (MOSTRUÁRIO - Antes de rolar)
      // Mantém o 20 de frente e gira devagarzinho
      diceRef.current.rotation.x = THREE.MathUtils.damp(diceRef.current.rotation.x, 1.45, 4, delta);
      diceRef.current.rotation.z = THREE.MathUtils.damp(diceRef.current.rotation.z, 0, 4, delta);
      diceRef.current.rotation.y += 0.5 * delta; 
    }
  });

  return (
    <group ref={diceRef} scale={2.5} position={[0, 0.8, 0]}> 
      <DiceModel /> 
    </group>
  );
};

export interface RollBonus {
  id: string; name: string; value: string; type: 'flat'|'dice'; active: boolean; icon: string;
}

interface BaldursDiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  difficultyClass: number;
  baseModifier: number;
  proficiency: number;
  rollType?: 'normal' | 'advantage' | 'disadvantage';
  extraBonuses?: RollBonus[];
  onComplete: (total: number, isSuccess: boolean, isCrit: boolean) => void;
}

const BaldursDiceRoller: React.FC<BaldursDiceRollerProps> = ({ 
  isOpen, onClose, title, subtitle, difficultyClass, baseModifier, proficiency, onComplete 
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showTotal, setShowTotal] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setResult(null);
        setShowTotal(false);
        setIsRolling(false);
    }
  }, [isOpen]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setResult(null);
    setShowTotal(false);
    setIsRolling(false);
  };

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setShowTotal(false);
    rollSound.play();

    // 1.5 segundos de "Giro Rápido"
    setTimeout(() => {
      const val = Math.floor(Math.random() * 20) + 1;
      setResult(val); // Começa a frear
      setIsRolling(false);
      
      const total = val + baseModifier + proficiency;

      // Espera mais 1.6 segundos para o dado frear TOTALMENTE
      setTimeout(() => {
          if (total >= difficultyClass) successSound.play();
          setShowTotal(true); // AGORA sim mostra o resultado
      }, 1600); 

    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0e] to-black animate-in fade-in duration-500">
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>

      <div className="relative w-full h-full max-w-4xl flex flex-col items-center justify-center">
        
        {/* CABEÇALHO */}
        <div className="absolute top-16 text-center z-20 pointer-events-none space-y-2">
          <h2 className="text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] filter">
            {title}
          </h2>
          <div className="flex items-center justify-center gap-2">
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
             <p className="text-yellow-100/60 italic text-xl font-serif tracking-wider">{subtitle}</p>
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
          </div>
        </div>

        {/* DIFICULDADE */}
        <div className="absolute top-20 right-10 z-20 flex flex-col items-center group">
            <span className="text-yellow-500/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Dificuldade</span>
            <div className="relative flex items-center justify-center w-16 h-16">
                <div className="absolute inset-0 rounded-full border border-yellow-500/30 animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-0 rounded-full border border-yellow-500/10 scale-125"></div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white font-serif">{difficultyClass}</span>
                </div>
            </div>
        </div>

        {/* PALCO 3D */}
        <div className="w-full h-[600px] relative cursor-pointer group" onClick={!isRolling && !showTotal ? handleRoll : undefined}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none transition-opacity duration-500 group-hover:bg-blue-500/20"></div>

            <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1.5} castShadow color="#fffaed" />
                <pointLight position={[-10, -5, -10]} intensity={1} color="#4f46e5" />
                <pointLight position={[0, -5, 5]} intensity={0.5} color="#eab308" />
                <Environment preset="city" />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Sparkles count={50} scale={6} size={2} speed={0.4} opacity={0.5} color="#fbbf24" />

                <Suspense fallback={null}>
                    <SpinningDice isRolling={isRolling} finalResult={result} />
                    <ContactShadows position={[0, -3, 0]} opacity={0.5} scale={25} blur={3} far={5} color="#000" />
                </Suspense>
                
                <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>

            {!isRolling && result === null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mt-40">
                    <span className="text-yellow-100/30 uppercase tracking-[0.4em] text-xs font-bold animate-pulse border-b border-yellow-100/10 pb-1">
                        Clique para Iniciar o Destino
                    </span>
                </div>
            )}

            {/* Resultado Flutuante (SÓ APARECE NO FINAL) */}
            {!isRolling && showTotal && (
                <div className="absolute inset-0 flex items-start justify-center pointer-events-none z-10 pt-4">
                     <div className={`relative flex items-center justify-center animate-in zoom-in duration-300`}>
                        <div className={`absolute w-32 h-32 blur-[40px] rounded-full ${result === 20 ? 'bg-green-500/40' : result === 1 ? 'bg-red-500/40' : 'bg-white/10'}`}></div>
                        <span className={`text-8xl font-serif font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${
                            result === 20 ? 'text-transparent bg-clip-text bg-gradient-to-b from-green-200 to-green-500' : 
                            result === 1 ? 'text-red-500' : 
                            'text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400'
                        }`}>
                            {result}
                        </span>
                     </div>
                </div>
            )}
        </div>

        {/* PAINEL DE RESULTADO (SÓ APARECE NO FINAL) */}
        {showTotal && (
             <div className="absolute inset-0 flex items-end justify-center z-30 pointer-events-none pb-20">
                 <div className="relative bg-[#0F0F13]/90 backdrop-blur-md px-12 py-6 rounded-lg border border-yellow-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col items-center gap-4 pointer-events-auto min-w-[300px] animate-in slide-in-from-bottom-5 duration-500">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-yellow-400 shadow-[0_0_10px_yellow]"></div>

                    <div className="text-center">
                        <span className="text-yellow-500/60 text-[10px] uppercase tracking-[0.3em] block mb-2">Total Final</span>
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-5xl font-bold text-white font-serif drop-shadow-lg">
                                {result + baseModifier + proficiency}
                            </span>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500 font-mono border-t border-white/5 pt-2">
                            <span title="Dado" className="hover:text-white transition-colors">🎲 {result}</span>
                            <span>+</span>
                            <span title="Modificador">Mod {baseModifier}</span>
                            <span>+</span>
                            <span title="Proficiência">Prof {proficiency}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-2 w-full">
                      <button onClick={handleReset} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs uppercase tracking-widest rounded border border-gray-600">Rolar Novamente</button>
                      <button onClick={() => onComplete((result || 0) + baseModifier + proficiency, (result || 0) + baseModifier + proficiency >= difficultyClass, result === 20)} className="flex-1 px-4 py-2 bg-gradient-to-b from-yellow-700 to-yellow-900 hover:from-yellow-600 hover:to-yellow-800 text-yellow-100 font-bold text-xs uppercase tracking-widest rounded border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]">Aceitar</button>
                    </div>
                 </div>
             </div>
        )}

        <button onClick={onClose} className="absolute top-8 right-8 text-white/20 hover:text-white text-2xl z-50 transition-colors">✕</button>
      </div>
    </div>
  );
};

export default BaldursDiceRoller;