import React, { useState } from 'react';
import { Item } from '../App';

interface ItemCardProps {
    item: Item;
    onUpdate: (updates: Partial<Item>) => void;
    onDelete: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onUpdate, onDelete }) => {
    const [flipped, setFlipped] = useState(false);

    // --- FONTES ---
    const titleFont = { fontFamily: '"Uncial Antiqua", "Georgia", serif', textShadow: '1px 1px 0px rgba(255,255,255,0.4)' };
    const handwrittenFont = { fontFamily: '"Dancing Script", "Comic Sans MS", cursive', fontWeight: 600 };
    const standardFont = { fontFamily: '"Crimson Text", "Georgia", serif' };

    // --- ASSETS ---
    const assets = {
        bgPergaminho: '/assets/bg-pergaminho.png',
        faixaTopo: '/assets/faixa-dourada-topo.png',
        faixaBase: '/assets/faixa-dourada-base.png',
        seloCera: '/assets/selo-cera-vermelho.png',
        molduraMoeda: '/assets/moldura-moeda.png',
        lixeira: '/assets/ui-lixeira-bronze.png',
        dice: {
            d4: '/assets/d4-vazio.png',
            d6: '/assets/d6-vazio.png',
            d8: '/assets/d8-vazio.png',
            d10: '/assets/d10-vazio.png',
            d12: '/assets/d12-vazio.png',
            default: '/assets/moldura-dado.png'
        }
    };

    const getDiceImage = (damage: string) => {
        if (!damage) return assets.dice.default;
        const dmg = damage.toLowerCase();
        if (dmg.includes('d4')) return assets.dice.d4;
        if (dmg.includes('d6')) return assets.dice.d6;
        if (dmg.includes('d8')) return assets.dice.d8;
        if (dmg.includes('d10')) return assets.dice.d10;
        if (dmg.includes('d12')) return assets.dice.d12;
        return assets.dice.default;
    };

    return (
        <div 
            className="relative w-full h-auto aspect-[4/6] perspective-1000 cursor-pointer group mb-4 select-none min-w-[160px]"
            onClick={() => setFlipped(!flipped)}
        >
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                
                {/* ================= FRENTE DO CARD ================= */}
                <div className="absolute inset-0 w-full h-full backface-hidden drop-shadow-xl overflow-hidden ">
                    <img src={assets.bgPergaminho} alt="" className="w-full h-full object-fill filter drop-shadow-lg" />

                    <div className="absolute inset-0 flex flex-col items-center pt-2 pb-4 px-3">
                        
                        {/* 1. FAIXA DO TÍTULO (Larga e com margem inferior negativa para subir o conteúdo) */}
                        <div className="relative w-[120%] -mx-6 h-20 z-20 flex justify-center items-center shrink-0 -mt-2 -mb-10">
                            <img src={assets.faixaTopo} alt="" className="absolute inset-0 w-full h-full object-contain" />
                            
                            <div className="relative z-20 text-center mt-1.5 w-[80%]">
                                <h3 className="text-[#2c241b] font-bold text-sm uppercase leading-none truncate drop-shadow-sm" style={titleFont}>
                                    {item.name}
                                </h3>
                                <p className="text-[9px] text-[#5d4037] font-bold uppercase tracking-[0.2em] mt-0.5" style={standardFont}>
                                    {item.type}
                                </p>
                            </div>
                        </div>

                        {/* 2. Selo de Cera (Qtd) */}
                        <div className="absolute top-5 right-2 w-10 h-10 z-30 flex justify-center items-center">
                            <img src={assets.seloCera} alt="" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                            <span className="relative z-40 text-[#f3e5be] font-bold text-xs transform -rotate-12">x{item.quantity}</span>
                        </div>

                        {/* 3. Área Central (Travada em 160px para estabilizar o card) */}
                        <div className="w-full h-[160px] relative flex items-center justify-center z-0">
                            
                            {/* Imagem do Item centralizada e com altura máxima fixa */}
                            {item.image ? (
                                <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="w-auto h-full max-w-[85%] object-contain mx-auto drop-shadow-lg filter sepia-[0.2] contrast-110" 
                                />
                            ) : (
                                <span className="text-6xl opacity-20 text-[#8b6f4e]">⚔️</span>
                            )}

                            {/* ÍCONE DE DANO (Esquerda) - Alinhado ao centro da área de 160px */}
                            {item.stats?.damage && (
                                <div className="absolute left-[-7px] top-1/2 -translate-y-1/2 w-14 h-14 z-20 flex justify-center items-center">
                                    <img src={getDiceImage(item.stats.damage)} alt="Dado" className="absolute w-full h-full object-contain drop-shadow-md" />
                                    <div className="relative z-30 text-center leading-none mt-10 ml-0 transform -rotate-6">
                                        <span className="block text-[10px] font-black text-[#2c241b]">{item.stats.damage}</span>
                                    </div>
                                </div>
                            )}

                            {/* MOLDURA DE VALOR (Direita) - Alinhada ao centro da área de 160px */}
                            {item.value && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20">
                                    <img src={assets.molduraMoeda} alt="" className="w-9 h-9 object-contain drop-shadow-md" />
                                    <div className="text-center leading-none mt-0.7">
                                        <span className="block text-[10px] font-black text-[#2c241b]">{item.value}</span>
                                        <span className="block text-[6px] font-bold text-[#5d4037] uppercase">GP</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Faixa da Base (Puxada para cima para encaixar no pergaminho) */}
                        <div className="relative w-full h-14 z-10 flex justify-center items-center shrink-0 -mt-4">
                            <img src={assets.faixaBase} alt="" className="absolute inset-0 w-full h-full object-fill" />
                            <p className="relative z-20 text-[#2c241b] text-[10px] leading-none text-center line-clamp-2 px-10 -mt-1" style={handwrittenFont}>
                                {item.description || "Um item misterioso sem história..."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ================= VERSO DO CARD ================= */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 drop-shadow-xl">
                    <img src={assets.bgPergaminho} alt="" className="absolute inset-0 w-full h-full object-fill" />
                    <div className="absolute inset-0 p-5 flex flex-col">
                        <h3 className="text-[#2c241b] font-bold text-center text-lg mb-2 pb-1 border-b border-[#8b6f4e]/30" style={titleFont}>DETALHES</h3>
                        <div className="flex-grow overflow-y-auto custom-scrollbar-dark pr-1">
                            <p className="text-[#2c241b] text-xs leading-relaxed" style={handwrittenFont}>
                                {item.description || "Sem descrição adicional."}
                            </p>
                            {item.stats?.properties && (
                                <div className="mt-3 pt-2 border-t border-[#8b6f4e]/20 text-[9px] text-[#5d4037]" style={standardFont}>
                                    <strong>Propriedades:</strong> {item.stats.properties.join(', ')}
                                </div>
                            )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-[#8b6f4e]/30 flex justify-between items-center">
                            <div className="flex items-center gap-2 bg-[#e6dcc3] px-2 py-1 rounded-full border border-[#8b6f4e] shadow-inner" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => onUpdate({quantity: Math.max(0, item.quantity - 1)})} className="w-5 h-5 rounded-full bg-[#5d4037] text-[#f3e5be] flex items-center justify-center font-bold hover:bg-[#3e2723] transition-colors">-</button>
                                <span className="font-bold text-[#2c241b] text-sm w-4 text-center" style={standardFont}>{item.quantity}</span>
                                <button onClick={() => onUpdate({quantity: item.quantity + 1})} className="w-5 h-5 rounded-full bg-[#5d4037] text-[#f3e5be] flex items-center justify-center font-bold hover:bg-[#3e2723] transition-colors">+</button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Jogar fora?')) onDelete(); }} className="w-9 h-9 hover:scale-110 transition-transform relative group" title="Excluir">
                                <img src={assets.lixeira} alt="Lixeira" className="w-full h-full object-contain drop-shadow-md" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ItemCard;