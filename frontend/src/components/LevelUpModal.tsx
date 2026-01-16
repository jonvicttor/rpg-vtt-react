import React, { useState } from 'react';
import { Entity } from '../App';

interface LevelUpModalProps {
    newLevel: number;
    hpGain: number;
    oldStats: { str: number, dex: number, con: number, int: number, wis: number, cha: number };
    onConfirm: (updates: Partial<Entity>) => void;
}

const ATTRIBUTES = [
    { key: 'str', label: 'Força' },
    { key: 'dex', label: 'Destreza' },
    { key: 'con', label: 'Constituição' },
    { key: 'int', label: 'Inteligência' },
    { key: 'wis', label: 'Sabedoria' },
    { key: 'cha', label: 'Carisma' }
];

const LevelUpModal: React.FC<LevelUpModalProps> = ({ newLevel, hpGain, oldStats, onConfirm }) => {
    // Regra D&D 5e: ASI (Ability Score Improvement) nos níveis 4, 8, 12, 16, 19
    const isASILevel = [4, 8, 12, 16, 19].includes(newLevel);
    
    // Pontos disponíveis para gastar (apenas se for nível de ASI)
    const [pointsLeft, setPointsLeft] = useState(isASILevel ? 2 : 0);
    const [stats, setStats] = useState({ ...oldStats });

    const handleIncrease = (key: string) => {
        if (pointsLeft > 0 && stats[key as keyof typeof stats] < 20) {
            setStats(prev => ({ ...prev, [key]: prev[key as keyof typeof stats] + 1 }));
            setPointsLeft(prev => prev - 1);
        }
    };

    const handleDecrease = (key: string) => {
        // Só permite diminuir se ainda tivermos o valor original (não pode diminuir stats base)
        if (stats[key as keyof typeof stats] > oldStats[key as keyof typeof oldStats]) {
            setStats(prev => ({ ...prev, [key]: prev[key as keyof typeof stats] - 1 }));
            setPointsLeft(prev => prev + 1);
        }
    };

    const handleSave = () => {
        // Envia as atualizações de volta para o sistema
        // Nota: O HP já foi atualizado no App.tsx, aqui só confirmamos ou atualizamos atributos
        if (isASILevel) {
            onConfirm({ stats: stats }); 
        } else {
            onConfirm({});
        }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
            <div className="bg-rpgPanel border-2 border-yellow-500 rounded-lg shadow-[0_0_50px_rgba(234,179,8,0.5)] w-[500px] p-6 text-center relative overflow-hidden">
                {/* Efeito de Fundo */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>

                <h1 className="text-4xl font-black text-yellow-500 uppercase tracking-widest mb-1 drop-shadow-md">Level Up!</h1>
                <h2 className="text-2xl text-white font-bold mb-6">Você alcançou o Nível {newLevel}</h2>

                <div className="bg-black/40 border border-white/10 rounded p-4 mb-6">
                    <p className="text-gray-300 text-sm uppercase tracking-widest mb-2">Melhorias Recebidas</p>
                    <div className="flex justify-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-3xl">❤️</span>
                            <span className="text-green-400 font-bold text-xl">+{hpGain} PV</span>
                            <span className="text-[10px] text-gray-500">Vida Máxima</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl">🎲</span>
                            <span className="text-blue-400 font-bold text-xl">
                                {newLevel % 4 === 1 ? '+1' : '-'} PB
                            </span>
                            <span className="text-[10px] text-gray-500">Proficiência</span>
                        </div>
                    </div>
                </div>

                {isASILevel ? (
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <p className="text-yellow-400 text-sm font-bold uppercase">Distribua seus Pontos</p>
                            <span className="text-xs bg-yellow-900/50 text-yellow-200 px-2 py-1 rounded border border-yellow-500/30">
                                Restantes: {pointsLeft}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {ATTRIBUTES.map((attr) => (
                                <div key={attr.key} className="flex flex-col items-center bg-black/50 p-2 rounded border border-white/10">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">{attr.label}</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleDecrease(attr.key)}
                                            disabled={stats[attr.key as keyof typeof stats] <= oldStats[attr.key as keyof typeof oldStats]}
                                            className="w-6 h-6 bg-red-900/50 hover:bg-red-600 rounded text-xs disabled:opacity-30 transition-colors"
                                        >-</button>
                                        <span className={`text-lg font-bold ${stats[attr.key as keyof typeof stats] > oldStats[attr.key as keyof typeof oldStats] ? 'text-green-400' : 'text-white'}`}>
                                            {stats[attr.key as keyof typeof stats]}
                                        </span>
                                        <button 
                                            onClick={() => handleIncrease(attr.key)}
                                            disabled={pointsLeft === 0 || stats[attr.key as keyof typeof stats] >= 20}
                                            className="w-6 h-6 bg-green-900/50 hover:bg-green-600 rounded text-xs disabled:opacity-30 transition-colors"
                                        >+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-xs italic mb-6">Nenhuma distribuição de atributos neste nível.</p>
                )}

                <button 
                    onClick={handleSave}
                    disabled={isASILevel && pointsLeft > 0} // Obriga a gastar tudo se for ASI
                    className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded shadow-lg uppercase tracking-widest transition-all active:scale-95"
                >
                    Confirmar Evolução
                </button>
            </div>
        </div>
    );
};

export default LevelUpModal;