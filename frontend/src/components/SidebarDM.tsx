import React, { useState } from 'react';
import Soundboard from './Soundboard';
import Chat from './Chat';
import { Entity, MonsterPreset } from '../App';
import EditEntityModal from './EditEntityModal';

export interface InitiativeItem {
  id: number;
  name: string;
  value: number;
}

interface SidebarDMProps {
  entities: Entity[];
  onUpdateHP: (id: number, change: number) => void;
  onAddEntity: (type: 'enemy' | 'player', name: string, preset?: MonsterPreset) => void;
  onDeleteEntity: (id: number) => void;
  onEditEntity: (id: number, updates: Partial<Entity>) => void;
  
  isFogMode: boolean;
  onToggleFogMode: () => void;
  onResetFog: () => void;
  onRevealAll: () => void;
  fogTool: 'reveal' | 'hide';
  onSetFogTool: (tool: 'reveal' | 'hide') => void;
  onSyncFog: () => void;
  onSaveGame: () => void;
  onChangeMap: (mapUrl: string) => void;

  initiativeList: InitiativeItem[];
  activeTurnId: number | null;
  onAddToInitiative: (entity: Entity) => void;
  onRemoveFromInitiative: (id: number) => void;
  onNextTurn: () => void;
  onClearInitiative: () => void;
  onSortInitiative: () => void;

  targetEntityIds: number[];
  attackerId: number | null;
  onSetTarget: (id: number | null, multiSelect?: boolean) => void;
  
  onToggleCondition: (id: number, condition: string) => void;

  // --- NOVO: PROPS DE AOE ---
  activeAoE: 'circle' | 'cone' | 'cube' | null;
  onSetAoE: (type: 'circle' | 'cone' | 'cube' | null) => void;
}

const EntityControlRow = ({ entity, onUpdateHP, onDeleteEntity, onClickEdit, onAddToInit, isTarget, onSetTarget, onToggleCondition }: { entity: Entity, onUpdateHP: any, onDeleteEntity: any, onClickEdit: () => void, onAddToInit: () => void, isTarget: boolean, onSetTarget: (id: number, multiSelect?: boolean) => void, onToggleCondition: (id: number, condition: string) => void }) => {
  const hpPercent = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));
  
  const isDead = entity.hp <= 0;

  let barColor = 'bg-green-500';
  if (hpPercent < 30) barColor = 'bg-red-600';
  else if (hpPercent < 60) barColor = 'bg-yellow-500';

  return (
    <div 
      className={`relative p-3 rounded border transition-all flex flex-col gap-2 group overflow-hidden cursor-pointer 
        ${isDead ? 'opacity-60 grayscale bg-gray-900 border-gray-800' : ''} 
        ${isTarget && !isDead ? 'bg-red-900/30 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-rpgBg/50 border-rpgAccent/10 hover:bg-rpgBg/80'}
      `}
      onClick={(e) => onSetTarget(entity.id, e.shiftKey)}
    >
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
            <span className="text-4xl">💀</span>
        </div>
      )}

      {/* Ícones de Condição na Lista Lateral */}
      {entity.conditions && entity.conditions.length > 0 && !isDead && (
          <div className="absolute top-1 left-1 flex gap-0.5 z-10 pointer-events-none">
              {entity.conditions.map(c => (
                  <span key={c} className="text-[10px]">
                      {{'poison': '☠️', 'fire': '🔥', 'stun': '💫', 'shield': '🛡️', 'blood': '🩸', 'sleep': '💤', 'web': '🕸️'}[c]}
                  </span>
              ))}
          </div>
      )}

      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/60 rounded px-1">
        <button onClick={(e) => { e.stopPropagation(); onAddToInit(); }} className="text-gray-400 hover:text-yellow-400 text-[10px] p-1">⚔️</button>
        <button onClick={(e) => { e.stopPropagation(); onClickEdit(); }} className="text-gray-400 hover:text-blue-400 text-[10px] p-1">✎</button>
        <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Deletar ${entity.name}?`)) onDeleteEntity(entity.id); }} className="text-gray-400 hover:text-red-500 text-[10px] p-1">✕</button>
      </div>

      <div className="flex items-center justify-between pr-2 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            {entity.image ? (
              <img src={entity.image} alt={entity.name} className="w-full h-full rounded-full object-cover border border-white/20 shadow-sm"/>
            ) : (
              <div className="w-full h-full rounded-full" style={{ backgroundColor: entity.color }}></div>
            )}
          </div>
          <div className="overflow-hidden">
             <span className={`text-rpgText font-bold text-sm truncate block ${isDead ? 'line-through text-gray-500' : ''}`}>{entity.name}</span>
             <span className="text-[10px] text-gray-500 uppercase">{entity.classType || 'NPC'}</span>
          </div>
        </div>
        <div className="text-right">
           <span className={`text-xs font-bold font-mono ${isDead ? 'text-gray-500' : (entity.hp < entity.maxHp / 2 ? 'text-red-500' : 'text-green-400')}`}>
             {entity.hp}/{entity.maxHp}
           </span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5 mt-1 z-10 relative">
        <div className={`h-full ${barColor} transition-all duration-500 ease-out`} style={{ width: `${hpPercent}%` }}></div>
      </div>
    </div>
  );
};

const CombatVsPanel = ({ attacker, targets, onUpdateHP }: { attacker: Entity | null, targets: Entity[], onUpdateHP: (id: number, change: number) => void }) => {
    const [amount, setAmount] = useState('');
    
    const applyToAll = (damage: boolean) => {
        const val = parseInt(amount);
        if (val) {
            targets.forEach(ent => { onUpdateHP(ent.id, damage ? -val : val); });
            setAmount('');
        }
    };

    const renderHpBar = (entity: Entity) => {
        const hpPercent = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));
        let barColor = 'bg-green-500';
        if (hpPercent < 30) barColor = 'bg-red-600';
        else if (hpPercent < 60) barColor = 'bg-yellow-500';

        return (
            <div className="flex flex-col items-center w-full px-1 mt-2">
                <div className="w-20 h-2 bg-gray-700 rounded-full border border-black/50 overflow-hidden relative shadow-inner">
                    <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${hpPercent}%` }}></div>
                </div>
                <span className="text-[9px] text-white/80 font-mono mt-0.5 font-bold shadow-black drop-shadow-md">
                    {entity.hp}/{entity.maxHp}
                </span>
            </div>
        );
    };

    if (targets.length === 0 && !attacker) return null;

    return (
        <section className="mb-4 bg-gradient-to-r from-blue-900/20 to-red-900/20 border border-white/10 rounded-lg p-3 animate-in fade-in zoom-in duration-200">
            <h3 className="text-white/50 font-bold text-[10px] uppercase tracking-widest mb-2 text-center">
                ⚔️ RESOLUÇÃO DE COMBATE
            </h3>
            
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex flex-col items-center w-1/3">
                    {attacker ? (
                        <>
                            <div className="w-12 h-12 rounded-full border-2 border-blue-500 overflow-hidden shadow-lg bg-black relative">
                                <img src={attacker.image || ''} className="w-full h-full object-cover" alt="" />
                            </div>
                            <span className="text-[10px] text-blue-300 font-bold mt-1 truncate max-w-full text-center leading-tight">{attacker.name}</span>
                            {renderHpBar(attacker)}
                        </>
                    ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-blue-500/30 flex items-center justify-center text-blue-500/30 text-xs">?</div>
                    )}
                </div>

                <div className="text-white/20 text-xl font-black">VS</div>

                <div className="flex flex-col items-center w-1/3">
                    {targets.length > 0 ? (
                        <>
                            <div className="flex -space-x-2 overflow-hidden justify-center w-full">
                                {targets.slice(0, 3).map(t => (
                                    <div key={t.id} className="w-8 h-8 rounded-full border border-red-500 overflow-hidden bg-black flex-shrink-0">
                                        <img src={t.image || ''} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                                {targets.length > 3 && (
                                    <div className="w-8 h-8 rounded-full border border-red-500 bg-red-900 text-white text-[8px] flex items-center justify-center">+{targets.length - 3}</div>
                                )}
                            </div>
                            <span className="text-[10px] text-red-400 font-bold mt-1">{targets.length} Alvo(s)</span>
                            {targets.length === 1 && renderHpBar(targets[0])}
                        </>
                    ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500/30 flex items-center justify-center text-red-500/30 text-xs">?</div>
                    )}
                </div>
            </div>

            {targets.length > 0 && (
                <div className="flex gap-2 border-t border-white/5 pt-3">
                    <input type="number" placeholder="Dano" className="w-16 bg-black/50 border border-white/20 rounded p-1 text-center text-white text-sm font-bold outline-none focus:border-red-500" value={amount} onChange={e => setAmount(e.target.value)} autoFocus onKeyDown={e => { if(e.key === 'Enter') applyToAll(true); }} />
                    <button onClick={() => applyToAll(true)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-lg uppercase text-[10px]">Aplicar Dano</button>
                </div>
            )}
        </section>
    );
};

const AVAILABLE_MAPS = [
  { name: 'Floresta', url: '/maps/floresta.jpg' },
  { name: 'Caverna', url: '/maps/caverna.jpg' },
  { name: 'Taverna', url: '/maps/taverna.jpg' },
  { name: 'Masmorra', url: '/maps/masmorra.jpg' },
];

const MONSTER_LIST: MonsterPreset[] = [
  { name: 'Lobo', hp: 11, ac: 13, image: '/tokens/lobo.png' },
  { name: 'Goblin', hp: 7, ac: 15, image: '/tokens/goblin.png' },
  { name: 'Esqueleto', hp: 13, ac: 13, image: '/tokens/skeleton.png' },
  { name: 'Orc', hp: 15, ac: 13, image: '/tokens/orc.png' },
  { name: 'Bandido', hp: 11, ac: 12, image: '/tokens/bandido.png' },
  { name: 'Zumbi', hp: 22, ac: 8, image: '/tokens/zumbi.png' },
];

const SidebarDM: React.FC<SidebarDMProps> = ({ 
  entities, onUpdateHP, onAddEntity, onDeleteEntity, onEditEntity,
  isFogMode, onToggleFogMode, onResetFog, onRevealAll,
  fogTool, onSetFogTool, onSyncFog, onSaveGame, onChangeMap,
  initiativeList, activeTurnId, onAddToInitiative, onRemoveFromInitiative, onNextTurn, onClearInitiative, onSortInitiative,
  targetEntityIds, attackerId, onSetTarget,
  onToggleCondition,
  activeAoE, onSetAoE // Props novas
}) => {
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [showMonsterSelector, setShowMonsterSelector] = useState(false);

  const handleDragStart = (e: React.DragEvent, type: 'enemy' | 'player') => {
    e.dataTransfer.setData("entityType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleSelectMonster = (monster: MonsterPreset) => {
    const count = entities.filter(e => e.name.startsWith(monster.name)).length;
    const finalName = count > 0 ? `${monster.name} ${count + 1}` : monster.name;
    onAddEntity('enemy', finalName, monster);
    setShowMonsterSelector(false); 
  };

  const attacker = entities.find(e => e.id === attackerId) || null;
  const targets = entities.filter(e => targetEntityIds.includes(e.id));

  const toggleConditionForAll = (cond: string) => {
      targets.forEach(t => onToggleCondition(t.id, cond));
  };

  return (
    <>
      {editingEntity && (<EditEntityModal entity={editingEntity} onSave={onEditEntity} onClose={() => setEditingEntity(null)} />)}

      {showMonsterSelector && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowMonsterSelector(false)}>
          <div className="bg-gray-900 border border-red-900/50 p-6 rounded-lg shadow-2xl w-[400px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-red-500 font-bold uppercase tracking-widest mb-4 text-center border-b border-white/10 pb-2">Invocar Monstro</h3>
            <div className="grid grid-cols-2 gap-3">
              {MONSTER_LIST.map((monster) => (
                <button 
                  key={monster.name} 
                  onClick={() => handleSelectMonster(monster)}
                  className="flex flex-col items-center bg-black/40 hover:bg-red-900/20 border border-white/10 hover:border-red-500/50 p-3 rounded transition-all group"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border border-white/20 group-hover:border-red-500">
                    <img src={monster.image} alt={monster.name} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = '/tokens/lobo.png'} />
                  </div>
                  <span className="text-sm font-bold text-gray-300 group-hover:text-white">{monster.name}</span>
                  <div className="flex gap-2 text-[10px] text-gray-500 font-mono mt-1">
                    <span>❤️ {monster.hp}</span>
                    <span>🛡️ {monster.ac}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMonsterSelector(false)} className="w-full mt-4 py-2 text-xs text-gray-500 hover:text-white border border-transparent hover:border-white/20 rounded">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-rpgPanel shadow-2xl">
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
          <h2 className="text-rpgAccent font-sans font-bold uppercase tracking-tighter text-xl mb-6 border-b border-rpgAccent/20 pb-2">Painel do Mestre</h2>

          {/* --- NOVO: FERRAMENTAS DE ÁREA DE EFEITO (AoE) --- */}
          <section className="mb-6 border-b border-white/5 pb-4">
             <h3 className="text-rpgText font-mono text-[10px] uppercase mb-2 opacity-50 tracking-widest">Ferramentas de Área</h3>
             <div className="flex gap-2">
                <button 
                    onClick={() => onSetAoE(activeAoE === 'circle' ? null : 'circle')} 
                    className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${activeAoE === 'circle' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                >
                    ⭕ Círculo
                </button>
                <button 
                    onClick={() => onSetAoE(activeAoE === 'cone' ? null : 'cone')} 
                    className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${activeAoE === 'cone' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                >
                    🔺 Cone
                </button>
                <button 
                    onClick={() => onSetAoE(activeAoE === 'cube' ? null : 'cube')} 
                    className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${activeAoE === 'cube' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                >
                    🟥 Cubo
                </button>
             </div>
             {activeAoE && <p className="text-[9px] text-yellow-500 mt-2 text-center animate-pulse border border-yellow-500/30 bg-yellow-900/20 rounded py-1">🖌️ Clique e arraste no mapa para desenhar</p>}
          </section>

          <CombatVsPanel attacker={attacker} targets={targets} onUpdateHP={onUpdateHP} />

          {/* PAINEL DE CONDIÇÕES */}
          {targets.length > 0 && (
              <section className="mb-6 bg-black/20 p-2 rounded border border-white/10">
                  <h3 className="text-rpgText font-mono text-[10px] uppercase mb-2 opacity-70">Aplicar Condição</h3>
                  <div className="flex gap-2 justify-center flex-wrap">
                      {['poison', 'fire', 'stun', 'shield', 'blood', 'sleep', 'web'].map(cond => (
                          <button 
                            key={cond} 
                            onClick={() => toggleConditionForAll(cond)}
                            className={`w-8 h-8 rounded border flex items-center justify-center text-lg transition-all hover:bg-white/20 bg-transparent border-white/20 hover:scale-110 active:scale-95`}
                            title={cond}
                          >
                              {{'poison': '☠️', 'fire': '🔥', 'stun': '💫', 'shield': '🛡️', 'blood': '🩸', 'sleep': '💤', 'web': '🕸️'}[cond]}
                          </button>
                      ))}
                  </div>
              </section>
          )}

          {/* ... Restante do código (Iniciativa, Lista, etc.) ... */}
          {initiativeList.length > 0 && (
            <section className="mb-6 bg-black/40 border border-yellow-900/30 rounded p-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest">Turno Atual</h3>
                <div className="flex gap-1">
                  <button onClick={onSortInitiative} className="text-[9px] bg-gray-700 px-2 rounded hover:bg-gray-600" title="Ordenar">Sort</button>
                  <button onClick={onClearInitiative} className="text-[9px] bg-red-900/50 px-2 rounded hover:bg-red-600" title="Limpar">Limpar</button>
                </div>
              </div>
              <div className="flex flex-col gap-1 mb-2 max-h-40 overflow-y-auto">
                {initiativeList.map((item, index) => (
                  <div key={index} 
                       className={`flex justify-between items-center p-2 rounded text-xs cursor-pointer ${item.id === activeTurnId ? 'bg-yellow-900/40 border border-yellow-500/50' : 'bg-white/5 hover:bg-white/10'}`}
                       onClick={(e) => onSetTarget(item.id, e.shiftKey)}
                  >
                    <span className={item.id === activeTurnId ? 'text-yellow-200 font-bold' : 'text-gray-300'}>{item.value} - {item.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveFromInitiative(item.id); }} className="text-red-500 hover:text-red-300 ml-2">×</button>
                  </div>
                ))}
              </div>
              <button onClick={onNextTurn} className="w-full py-2 bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-bold uppercase rounded shadow-lg border border-yellow-500/30">Próximo Turno ⏩</button>
            </section>
          )}

          <section className="mb-6 border-b border-white/5 pb-4">
             <h3 className="text-rpgText font-mono text-[10px] uppercase mb-2 opacity-50 tracking-widest">Cenário</h3>
             <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_MAPS.map(map => (
                  <button key={map.url} onClick={() => onChangeMap(map.url)} className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-[10px] font-bold py-2 rounded transition-all active:scale-95">{map.name}</button>
                ))}
             </div>
          </section>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button draggable onDragStart={(e) => handleDragStart(e, 'enemy')} onClick={() => setShowMonsterSelector(true)} className="bg-red-900/50 hover:bg-red-600 border border-red-500/30 text-white text-xs font-bold py-2 rounded uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-grab">+ Inimigo</button>
            <button draggable onDragStart={(e) => handleDragStart(e, 'player')} onClick={() => onAddEntity('player', 'NPC')} className="bg-blue-900/50 hover:bg-blue-600 border border-blue-500/30 text-white text-xs font-bold py-2 rounded uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-grab">+ Aliado</button>
          </div>

          <section className="mb-6 border-t border-b border-white/5 py-4 bg-black/20 rounded">
            <h3 className="text-rpgText font-mono text-[10px] uppercase mb-3 opacity-50 tracking-widest px-2">Neblina de Guerra</h3>
            <div className="flex flex-col gap-2 px-2">
              <button onClick={onToggleFogMode} className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider border transition-all ${isFogMode ? 'bg-yellow-600 border-yellow-400 text-white shadow-sm' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}>{isFogMode ? '✎ Modo Edição Ativo' : '✎ Editar Neblina'}</button>
              {isFogMode && (
                <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/10 mt-1 mb-1">
                  <button onClick={() => onSetFogTool('reveal')} className={`flex-1 py-1 text-[10px] uppercase font-bold rounded transition-colors ${fogTool === 'reveal' ? 'bg-green-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400'}`}>🔦 Revelar</button>
                  <button onClick={() => onSetFogTool('hide')} className={`flex-1 py-1 text-[10px] uppercase font-bold rounded transition-colors ${fogTool === 'hide' ? 'bg-red-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400'}`}>☁️ Esconder</button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onRevealAll} className="flex-1 py-1 bg-gray-800 hover:bg-gray-700 text-[9px] text-gray-400 rounded border border-gray-700">Tudo Visível</button>
                <button onClick={onResetFog} className="flex-1 py-1 bg-gray-800 hover:bg-gray-700 text-[9px] text-gray-400 rounded border border-gray-700">Tudo Preto</button>
              </div>
              <button onClick={onSyncFog} className="w-full py-1 mt-2 bg-purple-900/30 hover:bg-purple-600/50 border border-purple-500/30 text-[9px] text-purple-200 uppercase font-bold rounded transition-all">📡 Sincronizar Jogadores</button>
            </div>
          </section>

          <section className="mb-6 border-t border-b border-white/5 py-4 bg-black/20 rounded">
            <h3 className="text-rpgText font-mono text-[10px] uppercase mb-3 opacity-50 tracking-widest px-2">Sistema</h3>
            <div className="px-2">
              <button onClick={onSaveGame} className="w-full py-2 bg-green-900/40 hover:bg-green-600/60 border border-green-500/30 text-green-200 text-xs font-bold uppercase rounded transition-all shadow-lg">💾 Salvar Estado do Jogo</button>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-rpgText font-mono text-[10px] uppercase mb-3 opacity-50 tracking-widest">Combate / Status</h3>
            <div className="space-y-2">
              {entities.map((entity) => (
                <EntityControlRow 
                    key={entity.id} 
                    entity={entity} 
                    onUpdateHP={onUpdateHP} 
                    onDeleteEntity={onDeleteEntity} 
                    onClickEdit={() => setEditingEntity(entity)} 
                    onAddToInit={() => onAddToInitiative(entity)} 
                    isTarget={targetEntityIds.includes(entity.id)} 
                    onSetTarget={onSetTarget}
                    onToggleCondition={onToggleCondition} 
                />
              ))}
            </div>
          </section>
          <Soundboard />
        </div>
        <div className="border-t border-rpgAccent/10 bg-black/20">
          <div className="flex items-center justify-between px-4 py-1 border-b border-white/5">
            <p className="text-[8px] text-rpgText/30 font-mono italic">v2.9 - Conditions</p>
            <span className="text-[8px] text-rpgAccent/50 font-mono uppercase">Mestre On-line</span>
          </div>
          <Chat />
        </div>
      </div>
    </>
  );
};

export default SidebarDM;