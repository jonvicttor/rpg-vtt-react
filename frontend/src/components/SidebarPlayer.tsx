import React, { useState, useEffect, useRef } from 'react';
import Chat, { ChatMessage } from './Chat';
import { Entity } from '../App';
import { InitiativeItem } from './SidebarDM'; 
import LevelUpModal from './LevelUpModal';
import { getLevelFromXP, getNextLevelXP, getProficiencyBonus, calculateHPGain, XP_TABLE } from '../utils/gameRules';

// --- CONFIGURAÇÃO DAS HABILIDADES COM NÍVEL DE DESBLOQUEIO ---
const CLASS_ABILITIES: Record<string, { name: string; max: number; icon: string; desc: string; color: string; unlockLevel: number }[]> = {
  'BARBARO': [
    { name: 'Fúria', max: 2, icon: '😡', desc: 'Vantagem em FOR, Resistência a dano.', color: 'text-red-500', unlockLevel: 1 },
    { name: 'Ataque Imprudente', max: 99, icon: '⚠️', desc: 'Vantagem no ataque, inimigos têm vantagem em você.', color: 'text-orange-500', unlockLevel: 2 }
  ],
  'BARDO': [
    { name: 'Inspiração Bárdica', max: 3, icon: '🎵', desc: 'Concede um dado extra para um aliado.', color: 'text-pink-500', unlockLevel: 1 },
    { name: 'Palavras Cortantes', max: 3, icon: '🤬', desc: 'Subtrai o resultado de um ataque inimigo.', color: 'text-purple-500', unlockLevel: 3 }
  ],
  'CLERIGO': [
    { name: 'Curar Ferimentos', max: 2, icon: '✨', desc: 'Rola 1d8 + Sabedoria de cura.', color: 'text-blue-400', unlockLevel: 1 },
    { name: 'Canalizar Divindade', max: 1, icon: '🙏', desc: 'Efeito especial do domínio divino.', color: 'text-yellow-400', unlockLevel: 2 }
  ],
  'DRUIDA': [
    { name: 'Curar Ferimentos', max: 2, icon: '🌿', desc: 'Rola 1d8 + Sabedoria de cura.', color: 'text-emerald-400', unlockLevel: 1 },
    { name: 'Forma Selvagem', max: 2, icon: '🐻', desc: 'Transforma-se em uma fera.', color: 'text-green-500', unlockLevel: 2 }
  ],
  'GUERREIRO': [
    { name: 'Retomar o Fôlego', max: 1, icon: '🩹', desc: 'Recupera 1d10 + Nível de PV imediatamente.', color: 'text-green-400', unlockLevel: 1 },
    { name: 'Surto de Ação', max: 1, icon: '⚡', desc: 'Ganha uma ação adicional no turno.', color: 'text-yellow-500', unlockLevel: 2 }
  ],
  'MONGE': [
    { name: 'Artes Marciais', max: 99, icon: '🥋', desc: 'Ataque desarmado bônus (sem custo).', color: 'text-gray-400', unlockLevel: 1 },
    { name: 'Rajada de Golpes', max: 2, icon: '👊', desc: 'Gasta 1 Ki para dois ataques extras.', color: 'text-cyan-400', unlockLevel: 2 },
    { name: 'Defesa Paciente', max: 2, icon: '🛡️', desc: 'Gasta 1 Ki para Esquiva como bônus.', color: 'text-blue-400', unlockLevel: 2 }
  ],
  'PALADINO': [
    { name: 'Cura pelas Mãos', max: 5, icon: '✋', desc: 'Cura pontos de vida (Pool).', color: 'text-yellow-500', unlockLevel: 1 },
    { name: 'Divine Smite', max: 2, icon: '✨', desc: 'Gasta slot para +2d8 de dano radiante extra.', color: 'text-amber-400', unlockLevel: 2 }
  ],
  'ARQUEIRO': [
    { name: 'Marca do Caçador', max: 2, icon: '🎯', desc: 'Dano extra em inimigos marcados.', color: 'text-green-500', unlockLevel: 1 },
    { name: 'Tiro Certeiro', max: 99, icon: '🏹', desc: '-5 acerto / +10 dano (Sharpshooter).', color: 'text-stone-400', unlockLevel: 4 }
  ],
  'ASSASSINO': [
    { name: 'Ataque Furtivo', max: 99, icon: '🗡️', desc: 'Dano extra (d6s por nível).', color: 'text-red-600', unlockLevel: 1 },
    { name: 'Ação Astuta', max: 99, icon: '💨', desc: 'Dash, Disengage ou Hide como bônus.', color: 'text-gray-400', unlockLevel: 2 }
  ],
  'FEITICEIRO': [
    { name: 'Escudo Arcano', max: 2, icon: '🛡️', desc: '+5 na AC como reação.', color: 'text-blue-500', unlockLevel: 1 },
    { name: 'Metamagia', max: 2, icon: '🔥', desc: 'Altera propriedades da magia.', color: 'text-red-500', unlockLevel: 3 }
  ],
  'BRUXO': [
    { name: 'Rajada Mística', max: 99, icon: '⚡', desc: 'Dano de força 1d10.', color: 'text-purple-400', unlockLevel: 1 },
    { name: 'Pacto', max: 1, icon: '👿', desc: 'Recupera slots em descanso curto.', color: 'text-purple-600', unlockLevel: 3 }
  ],
  'MAGO': [
    { name: 'Recuperação Arcana', max: 1, icon: '📘', desc: 'Recupera slots em descanso curto.', color: 'text-blue-500', unlockLevel: 1 },
    { name: 'Mísseis Mágicos', max: 2, icon: '🔮', desc: '3 dardos de 1d4+1 infalíveis.', color: 'text-indigo-400', unlockLevel: 1 }
  ],
};

interface SidebarPlayerProps {
  entities: Entity[];
  myCharacterName: string; // NOVA PROPRIEDADE: Nome do personagem logado
  initiativeList: InitiativeItem[];
  activeTurnId: number | null;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRollAttribute: (charName: string, attrName: string, mod: number) => void;
  onUpdateCharacter?: (id: number, updates: Partial<Entity>) => void;
}

const SidebarPlayer: React.FC<SidebarPlayerProps> = ({ 
  entities, myCharacterName, initiativeList, activeTurnId, chatMessages, onSendMessage, onRollAttribute, onUpdateCharacter 
}) => {
  const [activeTab, setActiveTab] = useState<'char' | 'chat'>('char');
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [pendingLevelData, setPendingLevelData] = useState<{ newLevel: number, hpGain: number } | null>(null);
  const [abilityUsage, setAbilityUsage] = useState<Record<string, number>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // FILTRO CORRIGIDO: Busca pelo NOME e pelo TIPO
  const myCharacter = entities.find(e => e.type === 'player' && e.name === myCharacterName); 

  // --- CÁLCULOS DE PROGRESSÃO ---
  const currentXP = myCharacter?.xp || 0;
  const calculatedLevel = getLevelFromXP(currentXP);
  const savedLevel = myCharacter?.level || 1;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
      if (myCharacter && calculatedLevel > savedLevel) {
          const hpGain = calculateHPGain(myCharacter.classType || 'npc', myCharacter.stats?.con || 10);
          setPendingLevelData({ newLevel: calculatedLevel, hpGain: hpGain });
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

  // --- LÓGICA AUTOMATIZADA DE HABILIDADES ---
  const handleUseAbility = (abilityName: string, max: number, desc: string) => {
    if (!myCharacter) return;
    
    // 1. Verifica Usos
    const key = `${myCharacter.name}_${abilityName}`;
    const current = abilityUsage[key] || 0;
    if (max !== 99 && current >= max) {
      alert("Habilidade esgotada! Faça um descanso.");
      return;
    }
    if (max !== 99) setAbilityUsage(prev => ({ ...prev, [key]: current + 1 }));

    // 2. Prepara Mensagem Padrão
    let customMessage = `**${myCharacter.name}** usou **${abilityName}**! \n> *${desc}*`;

    // 3. Automação Específica (Exemplos)
    if (abilityName === 'Retomar o Fôlego') {
        const roll = Math.floor(Math.random() * 10) + 1;
        const level = myCharacter.level || 1;
        const totalHeal = roll + level;
        const newHp = Math.min((myCharacter.hp || 0) + totalHeal, myCharacter.maxHp || 10);
        
        if (onUpdateCharacter) onUpdateCharacter(myCharacter.id, { hp: newHp });
        customMessage = `**${myCharacter.name}** usou **${abilityName}**!\n> 🩹 Recuperou **${totalHeal} PV** instantaneamente! (Rolagem: 1d10+${level} = [${roll}]+${level})`;
    }

    if (abilityName === 'Divine Smite') {
        const d1 = Math.floor(Math.random() * 8) + 1;
        const d2 = Math.floor(Math.random() * 8) + 1;
        customMessage = `**${myCharacter.name}** usou **${abilityName}** gastando um slot!\n> ⚡ **${d1+d2}** de Dano Radiante Extra (2d8: ${d1}, ${d2})`;
    }

    if (abilityName === 'Ataque Furtivo') {
        const diceCount = Math.ceil((myCharacter.level || 1) / 2);
        let total = 0;
        let rolls = [];
        for(let i=0; i<diceCount; i++) {
            const r = Math.floor(Math.random() * 6) + 1;
            total += r;
            rolls.push(r);
        }
        customMessage = `**${myCharacter.name}** acertou um ponto vital com **${abilityName}**!\n> 🗡️ **${total}** de Dano Extra (${diceCount}d6: ${rolls.join(', ')})`;
    }

    if (abilityName === 'Curar Ferimentos') {
        const d8 = Math.floor(Math.random() * 8) + 1;
        const wis = myCharacter.stats?.wis || 10;
        const mod = Math.floor((wis - 10) / 2);
        const total = d8 + mod;
        customMessage = `**${myCharacter.name}** canalizou energia positiva com **${abilityName}**!\n> 💚 Pode curar **${total} PV** em um alvo. (1d8+${mod}: [${d8}]+${mod})`;
    }

    onSendMessage(customMessage);
  };

  const handleLongRest = () => {
    if (!myCharacter || !onUpdateCharacter) return;
    if (window.confirm("Fazer um Descanso Longo?")) {
        setAbilityUsage({});
        onUpdateCharacter(myCharacter.id, { hp: myCharacter.maxHp });
        onSendMessage(`💤 **${myCharacter.name}** realizou um Descanso Longo. Vida e habilidades restauradas.`);
    }
  };

  // --- VISUAL XP BAR ---
  const nextLevelTotalXP = getNextLevelXP(savedLevel);
  const currentLevelBaseXP = XP_TABLE[savedLevel - 1] || 0;
  const xpVisivel = currentXP - currentLevelBaseXP;
  const xpNecessarioNoNivel = nextLevelTotalXP - currentLevelBaseXP;
  const profBonus = getProficiencyBonus(savedLevel);
  const xpPercent = Math.min(100, (xpVisivel / xpNecessarioNoNivel) * 100);

  return (
    <>
        {showLevelUpModal && pendingLevelData && myCharacter && (
            <LevelUpModal 
                newLevel={pendingLevelData.newLevel}
                hpGain={pendingLevelData.hpGain}
                charClass={myCharacter.classType || 'GUERREIRO'}
                oldStats={myCharacter.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }}
                onConfirm={handleConfirmLevelUp}
            />
        )}

        <div className="flex flex-col h-full bg-rpgPanel shadow-2xl border-l border-white/10">
        <div className="flex border-b border-white/10 bg-black/40">
            <button onClick={() => setActiveTab('char')} className={`flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'char' ? 'text-white bg-rpgAccent/20 border-b-2 border-rpgAccent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>👤 Ficha</button>
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'chat' ? 'text-white bg-rpgAccent/20 border-b-2 border-rpgAccent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>💬 Chat</button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'char' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                
                {/* 1. INICIATIVA */}
                <section className="bg-black/40 border border-white/10 rounded p-3">
                    <h3 className="text-yellow-500 font-mono text-xs uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Iniciativa</h3>
                    {initiativeList && initiativeList.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {initiativeList.map((item) => (
                                <div key={item.id} className={`flex justify-between items-center p-2 rounded text-xs transition-all ${item.id === activeTurnId ? 'bg-yellow-900/40 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5'}`}>
                                    <span className={`${item.id === activeTurnId ? 'text-yellow-200 font-bold' : 'text-gray-400'}`}>{item.value} - {item.name}</span>
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
                    
                    {/* 2. HEADER */}
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
                                    <span className="text-[10px] text-gray-500 font-normal mr-1 align-middle">NÍVEL</span>{savedLevel}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono bg-white/5 px-1 rounded mt-1 inline-block">PB: <span className="text-white font-bold">+{profBonus}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {/* HP Bar */}
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
                                <span>PV (Vida)</span>
                                <span className="text-green-400 font-bold">{myCharacter.hp} / {myCharacter.maxHp}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-white/10">
                                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (myCharacter.hp / myCharacter.maxHp) * 100))}%` }}></div>
                            </div>
                        </div>
                        {/* XP Bar */}
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
                                <span>Experiência</span>
                                <span className="text-purple-300">{xpVisivel} / {xpNecessarioNoNivel}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/10 relative">
                                <div className="h-full bg-gradient-to-r from-purple-700 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-700" style={{ width: `${xpPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* 3. HABILIDADES COM TRAVA DE NÍVEL */}
                    <div className="mb-6">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest border-b border-white/5 pb-1">Habilidades de Classe</p>
                        <div className="flex flex-col gap-2">
                            {CLASS_ABILITIES[myCharacter.classType?.toUpperCase() || 'GUERREIRO']?.map((ability, idx) => {
                                // VERIFICAÇÃO DE NÍVEL
                                if (savedLevel < ability.unlockLevel) return null;

                                const usageKey = `${myCharacter.name}_${ability.name}`;
                                const usedCount = abilityUsage[usageKey] || 0;
                                const isExhausted = ability.max !== 99 && usedCount >= ability.max;

                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => handleUseAbility(ability.name, ability.max, ability.desc)}
                                        disabled={isExhausted}
                                        className={`flex items-center gap-3 p-2 rounded border transition-all text-left group ${isExhausted ? 'bg-gray-800/50 border-transparent opacity-50 cursor-not-allowed' : 'bg-black/30 border-white/5 hover:border-blue-500/30 hover:bg-blue-900/10'}`}
                                    >
                                        <span className={`text-xl ${ability.color} ${isExhausted ? 'grayscale' : ''}`}>{ability.icon}</span>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-xs font-bold ${isExhausted ? 'text-gray-500' : 'text-gray-200 group-hover:text-white'}`}>{ability.name}</span>
                                                {ability.max !== 99 && (
                                                    <div className="flex gap-1">
                                                        {Array.from({ length: ability.max }).map((_, i) => (
                                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < usedCount ? 'bg-gray-700' : 'bg-green-400 shadow-[0_0_4px_lime]'}`}></div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-gray-500 truncate block">{ability.desc}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 4. ATRIBUTOS */}
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest border-b border-white/5 pb-1">Testes de Atributo</p>
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

                    {/* 5. DESCANSO LONGO */}
                    <button 
                        onClick={handleLongRest}
                        className="w-full mt-6 py-2 bg-indigo-900/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2"
                    >
                        <span>⛺</span> Descanso Longo
                    </button>

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