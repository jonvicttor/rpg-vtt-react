import React from 'react';
import { Entity } from '../App';
import { InitiativeItem } from './SidebarDM';
import socket from '../services/socket';
import Chat from './Chat';

interface SidebarPlayerProps {
  entities: Entity[];
  initiativeList: InitiativeItem[];
  activeTurnId: number | null;
}

// --- TRADUTOR DE ATRIBUTOS ---
const translateAttr: Record<string, string> = {
  str: 'FOR', // Força
  dex: 'DES', // Destreza
  con: 'CON', // Constituição
  int: 'INT', // Inteligência
  wis: 'SAB', // Sabedoria
  cha: 'CAR'  // Carisma
};

const SidebarPlayer: React.FC<SidebarPlayerProps> = ({ entities, initiativeList, activeTurnId }) => {

  const getMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleRollAttribute = (charName: string, attrKey: string, score: number) => {
    const mod = Math.floor((score - 10) / 2);
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    
    // Pega o nome em Português para o chat (ex: FOR em vez de STR)
    const attrNamePT = translateAttr[attrKey] || attrKey.toUpperCase();

    // Manda mensagem no chat
    socket.emit('sendMessage', {
      text: `🎲 Rolou ${attrNamePT}: [${d20}] ${mod >= 0 ? '+' : ''}${mod} = ${total}`,
      sender: charName,
      roomId: 'mesa-do-victor'
    });

    socket.emit('rollDice', { sides: 20, result: total, roomId: 'mesa-do-victor', user: charName });
  };

  return (
    <div className="flex flex-col h-full bg-rpgPanel shadow-2xl border-l border-rpgAccent/20">
      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        <h2 className="text-rpgAccent font-sans font-bold uppercase tracking-tighter text-xl mb-6 border-b border-rpgAccent/20 pb-2">
          Visão do Jogador
        </h2>

        {/* --- INICIATIVA --- */}
        {initiativeList.length > 0 && (
          <section className="mb-6 bg-black/40 border border-yellow-900/30 rounded p-2">
            <h3 className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest mb-2">Ordem de Combate</h3>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {initiativeList.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex justify-between items-center p-2 rounded text-xs transition-all ${
                    item.id === activeTurnId 
                      ? 'bg-yellow-600 text-white font-bold scale-105 shadow-lg border border-yellow-400' 
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <span>{index + 1}º</span>
                  <span className="truncate flex-1 ml-2">{item.name}</span>
                  <span className="font-mono opacity-50">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- LISTA DE PERSONAGENS / FICHA --- */}
        <div className="space-y-4">
          {entities.map((entity) => (
            <div key={entity.id} className="bg-rpgBg/50 rounded border border-rpgAccent/10 overflow-hidden">
              
              <div className="p-3 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                     {entity.image ? (
                       <img src={entity.image} alt={entity.name} className="w-full h-full rounded-full object-cover border border-white/20"/>
                     ) : (
                       <div className="w-full h-full rounded-full" style={{ backgroundColor: entity.color }}></div>
                     )}
                  </div>
                  <div>
                    <p className="text-rpgText font-bold text-sm">{entity.name}</p>
                    <span className="text-[10px] text-gray-500 uppercase">{entity.classType || 'NPC'}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Defesa</div>
                  <div className="font-mono font-bold text-white text-sm">🛡️ {entity.ac || 10}</div>
                </div>
              </div>

              <div className="px-3 pb-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>HP</span>
                    <span>{entity.hp}/{entity.maxHp}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-red-600 transition-all duration-500" 
                        style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                    ></div>
                </div>
              </div>

              {entity.stats && (
                <div className="grid grid-cols-3 gap-1 p-2 bg-black/30 border-t border-white/5">
                    {Object.entries(entity.stats).map(([key, value]) => (
                        <button 
                            key={key}
                            // Agora passamos a key original (ex: 'str') mas usamos o tradutor visualmente
                            onClick={() => handleRollAttribute(entity.name, key, value)}
                            className="flex flex-col items-center justify-center p-1 rounded hover:bg-white/10 transition-colors group cursor-pointer"
                            title={`Clique para rolar ${translateAttr[key] || key.toUpperCase()}`}
                        >
                            {/* AQUI ESTÁ A MUDANÇA VISUAL: */}
                            <span className="text-[9px] text-gray-500 uppercase font-bold">
                              {translateAttr[key] || key}
                            </span>
                            
                            <span className="text-sm font-mono font-bold text-white group-hover:text-yellow-400">{getMod(value)}</span>
                            <span className="text-[8px] text-gray-600 bg-black/50 px-1 rounded">{value}</span>
                        </button>
                    ))}
                </div>
              )}

            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t border-rpgAccent/10 bg-black/20">
         <div className="p-1 bg-black/40 text-[9px] text-center text-gray-600 font-mono border-b border-white/5">
            Clique nos atributos para rolar
         </div>
         <Chat />
      </div>
    </div>
  );
};

export default SidebarPlayer;