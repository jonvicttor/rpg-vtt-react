import React, { useState, useEffect } from 'react';
import Chat, { ChatMessage } from './Chat';
import { Entity } from '../App';
import { InitiativeItem } from './SidebarDM'; 
import LevelUpModal from './LevelUpModal';

// --- ATUALIZAÇÃO 1: IMPORTAR XP_TABLE PARA CALCULAR O PISO DO NÍVEL ---
import { getLevelFromXP, getNextLevelXP, getProficiencyBonus, calculateHPGain, XP_TABLE } from '../utils/gameRules';

interface SidebarPlayerProps {
  entities: Entity[];
  initiativeList: InitiativeItem[];
  activeTurnId: number | null;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRollAttribute: (charName: string, attrName: string, mod: number) => void;
  onUpdateCharacter?: (id: number, updates: Partial<Entity>) => void;
}

const SidebarPlayer: React.FC<SidebarPlayerProps> = ({ 
  entities, initiativeList, activeTurnId, chatMessages, onSendMessage, onRollAttribute, onUpdateCharacter 
}) => {
  const [activeTab, setActiveTab] = useState<'char' | 'chat'>('char');
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [pendingLevelData, setPendingLevelData] = useState<{ newLevel: number, hpGain: number } | null>(null);

  const myCharacter = entities.find(e => e.type === 'player'); 

  // --- CÁLCULOS DE PROGRESSÃO ---
  const currentXP = myCharacter?.xp || 0;
  // O "Level Real" calculado vs o "Level Salvo" na ficha
  const calculatedLevel = getLevelFromXP(currentXP);
  const savedLevel = myCharacter?.level || 1;

  // --- EFEITO: DETECTA LEVEL UP ---
  useEffect(() => {
      if (myCharacter && calculatedLevel > savedLevel) {
          const hpGain = calculateHPGain(myCharacter.classType || 'npc', myCharacter.stats?.con || 10);
          
          setPendingLevelData({
              newLevel: calculatedLevel,
              hpGain: hpGain
          });
          setShowLevelUpModal(true);
      }
  }, [calculatedLevel, savedLevel, myCharacter]);

  const handleConfirmLevelUp = (updates: Partial<Entity>) => {
      if (!myCharacter || !pendingLevelData || !onUpdateCharacter) return;

      const finalUpdates = {
          ...updates, 
          level: pendingLevelData.newLevel,
          hp: Math.min((myCharacter.hp || 0) + pendingLevelData.hpGain, (myCharacter.maxHp || 0) + pendingLevelData.hpGain), 
          maxHp: (myCharacter.maxHp || 0) + pendingLevelData.hpGain
      };

      onUpdateCharacter(myCharacter.id, finalUpdates);
      setShowLevelUpModal(false);
  };

  // --- ATUALIZAÇÃO 2: CÁLCULO VISUAL DA BARRA (RELATIVO) ---
  const nextLevelTotalXP = getNextLevelXP(savedLevel); // Meta total (ex: 900 para lv 3)
  const currentLevelBaseXP = XP_TABLE[savedLevel - 1] || 0; // Base do nível atual (ex: 300 para lv 2)
  
  // XP mostrado na barra (ex: 400 total - 300 base = 100 sobrando)
  const xpVisivel = currentXP - currentLevelBaseXP;
  // Tamanho da barra (ex: 900 meta - 300 base = 600 para upar)
  const xpNecessarioNoNivel = nextLevelTotalXP - currentLevelBaseXP;
  
  const profBonus = getProficiencyBonus(savedLevel);
  const xpPercent = Math.min(100, (xpVisivel / xpNecessarioNoNivel) * 100);

  return (
    <>
        {showLevelUpModal && pendingLevelData && myCharacter && (
            <LevelUpModal 
                newLevel={pendingLevelData.newLevel}
                hpGain={pendingLevelData.hpGain}
                oldStats={myCharacter.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }}
                onConfirm={handleConfirmLevelUp}
            />
        )}

        <div className="flex flex-col h-full bg-rpgPanel shadow-2xl border-l border-white/10">
        <div className="flex border-b border-white/10 bg-black/40">
            <button 
            onClick={() => setActiveTab('char')} 
            className={`flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'char' ? 'text-white bg-rpgAccent/20 border-b-2 border-rpgAccent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
            👤 Ficha
            </button>
            <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'chat' ? 'text-white bg-rpgAccent/20 border-b-2 border-rpgAccent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
            💬 Chat
            </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'char' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                
                <section className="bg-black/40 border border-white/10 rounded p-3">
                    <h3 className="text-yellow-500 font-mono text-xs uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Iniciativa</h3>
                    {initiativeList && initiativeList.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {initiativeList.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`flex justify-between items-center p-2 rounded text-xs transition-all ${
                                        item.id === activeTurnId 
                                        ? 'bg-yellow-900/40 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                                        : 'bg-white/5'
                                    }`}
                                >
                                    <span className={`${item.id === activeTurnId ? 'text-yellow-200 font-bold' : 'text-gray-400'}`}>
                                        {item.value} - {item.name}
                                    </span>
                                    {item.id === activeTurnId && <span className="text-[10px] text-yellow-500 animate-pulse">◀ VEZ</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-600 text-xs text-center py-2 italic">Aguardando combate...</p>
                    )}
                </section>

                {myCharacter ? (
                <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-4 relative overflow-hidden">
                    
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-full border-2 border-blue-400 overflow-hidden shadow-lg bg-black flex-shrink-0">
                        <img src={myCharacter.image || '/tokens/aliado.png'} className="w-full h-full object-cover" alt={myCharacter.name} />
                    </div>
                    <div className="flex-grow flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none">{myCharacter.name}</h2>
                            <span className="text-xs text-blue-400 font-mono">{myCharacter.classType || 'Aventureiro'}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-yellow-500 leading-none drop-shadow-md">
                                <span className="text-[10px] text-gray-500 font-normal mr-1 align-middle">NÍVEL</span>
                                {savedLevel}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono bg-white/5 px-1 rounded mt-1 inline-block">
                                PB: <span className="text-white font-bold">+{profBonus}</span>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="space-y-3 mb-4">
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
                                <span>PV (Vida)</span>
                                <span className="text-green-400 font-bold">{myCharacter.hp} / {myCharacter.maxHp}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-white/10">
                                <div 
                                    className="h-full bg-green-500 transition-all duration-500" 
                                    style={{ width: `${Math.max(0, Math.min(100, (myCharacter.hp / myCharacter.maxHp) * 100))}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* ATUALIZAÇÃO 3: EXIBIÇÃO VISUAL DA BARRA */}
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
                                <span>Experiência</span>
                                {/* Mostra o XP Relativo / XP Necessário para o próximo nível */}
                                <span className="text-purple-300">{xpVisivel} / {xpNecessarioNoNivel}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/10 relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-purple-700 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-700" 
                                    style={{ width: `${xpPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(myCharacter.stats || {}).map(([key, val]) => {
                            const mod = Math.floor((val - 10) / 2);
                            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                            return (
                                <button 
                                    key={key}
                                    onClick={() => onRollAttribute(myCharacter.name, key.toUpperCase(), mod)}
                                    className="flex flex-col items-center bg-black/50 hover:bg-blue-900/40 border border-white/10 hover:border-blue-500/50 p-2 rounded transition-all group active:scale-95"
                                    title="Clique para rolar"
                                >
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{key}</span>
                                    <span className="text-lg font-bold text-white group-hover:text-blue-300">{val}</span>
                                    <span className="text-[10px] text-blue-400 font-mono bg-blue-900/20 px-1 rounded">{modStr}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                ) : (
                    <div className="text-center text-gray-500 text-sm mt-10 p-4 border border-dashed border-white/10 rounded">
                        Seu personagem ainda não está no mapa.
                    </div>
                )}
            </div>
            )}

            {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                    <Chat messages={chatMessages} onSendMessage={onSendMessage} role="PLAYER" />
                </div>
            )}
        </div>
    </div>
    </>
  );
};

export default SidebarPlayer;