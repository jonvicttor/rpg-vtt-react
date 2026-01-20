// @ts-nocheck
import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { DiceModel } from './DiceModel'; 
import * as THREE from 'three';
import { Howl } from 'howler';

// --- SONS ---
const rollSound = new Howl({ src: ['/sfx/dado.mp3'], volume: 0.5 });
const successSound = new Howl({ src: ['/sfx/levelup.mp3'], volume: 0.4 });

// --- COMPONENTE DO DADO GIRATÓRIO ---
const SpinningDice = ({ isRolling }: { isRolling: boolean }) => {
  const diceRef = useRef<any>(null);
  
  useFrame((state, delta) => {
    if (!diceRef.current) return;
    if (isRolling) {
      diceRef.current.rotation.x += 15 * delta;
      diceRef.current.rotation.y += 10 * delta;
      diceRef.current.rotation.z += 5 * delta;
    } else {
      diceRef.current.rotation.x = THREE.MathUtils.lerp(diceRef.current.rotation.x, 0, 0.05);
      diceRef.current.rotation.y += 0.5 * delta;
      diceRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <group ref={diceRef} scale={2.5}> 
      <DiceModel /> 
    </group>
  );
};

// --- INTERFACES ---
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

// --- COMPONENTE PRINCIPAL ---
const BaldursDiceRoller: React.FC<BaldursDiceRollerProps> = ({ 
  isOpen, onClose, title, subtitle, difficultyClass, baseModifier, proficiency, onComplete 
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showTotal, setShowTotal] = useState(false);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setShowTotal(false);
    rollSound.play();

    setTimeout(() => {
      const val = Math.floor(Math.random() * 20) + 1;
      setResult(val);
      setIsRolling(false);
      
      const total = val + baseModifier + proficiency;
      if (total >= difficultyClass) setTimeout(() => successSound.play(), 200);

      setShowTotal(true);
      setTimeout(() => {
        onComplete(total, total >= difficultyClass, val === 20 || val === 1);
      }, 3000);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-[800px] h-[600px] flex flex-col items-center justify-center">
        <div className="absolute top-10 text-center z-20 pointer-events-none">
          <h2 className="text-4xl font-serif text-white tracking-widest uppercase shadow-black drop-shadow-lg">{title}</h2>
          <p className="text-gray-400 italic text-lg">{subtitle}</p>
        </div>

        <div className="absolute top-14 right-20 flex flex-col items-center z-20">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Dificuldade</span>
            <div className="text-3xl font-bold text-white border-2 border-white/20 bg-black/50 rounded-full w-16 h-16 flex items-center justify-center shadow-lg backdrop-blur-sm">{difficultyClass}</div>
        </div>

        <div className="w-full h-[500px] relative cursor-pointer" onClick={!isRolling && !showTotal ? handleRoll : undefined}>
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#4f46e5" />
                <Environment preset="city" />
                <Suspense fallback={null}>
                    <SpinningDice isRolling={isRolling} />
                    <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={10} blur={2.5} far={4} color="#000" />
                </Suspense>
                <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>

            {!isRolling && result !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className={`text-7xl font-serif font-bold drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300 ${result === 20 ? 'text-green-400' : result === 1 ? 'text-red-500' : 'text-white'}`}>
                        {result}
                    </span>
                </div>
            )}
            
            {!isRolling && result === null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mt-32">
                    <span className="text-blue-200/50 uppercase tracking-[0.5em] text-xs font-bold animate-pulse">Clique para Rolar</span>
                </div>
            )}
        </div>

        {showTotal && (
             <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                 <div className="mt-60 bg-black/80 px-12 py-6 rounded-xl border border-yellow-500/50 backdrop-blur-xl animate-in slide-in-from-bottom-10 zoom-in duration-500 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                    <span className="text-gray-400 text-xs uppercase block text-center tracking-widest mb-1">Resultado Final</span>
                    <div className="flex items-center gap-4">
                        <span className="text-6xl font-bold text-white font-serif">{result + baseModifier + proficiency}</span>
                    </div>
                 </div>
             </div>
        )}
        <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white text-2xl z-50 transition-colors">✕</button>
      </div>
    </div>
  );
};

export default BaldursDiceRoller;