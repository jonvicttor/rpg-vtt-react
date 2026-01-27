import React, { useState } from 'react';
import { Shield, Sword, Hand, Trash2, FlaskConical, Coins } from 'lucide-react'; 
import { Item } from '../App';

interface InventoryProps {
  items: Item[];
  onEquip?: (item: Item) => void;
  onDrop?: (item: Item) => void;
}

const Inventory: React.FC<InventoryProps> = ({ items, onEquip, onDrop }) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Filtra itens por slot
  const equippedWeapon = items.find(i => i.isEquipped && i.type === 'weapon');
  const equippedArmor = items.find(i => i.isEquipped && i.type === 'armor');
  const backpackItems = items.filter(i => !i.isEquipped);

  const renderItemIcon = (item: Item, size: number = 20) => {
      if (item.image) {
          return <img src={item.image} alt={item.name} className="w-full h-full object-cover" />;
      }
      switch (item.type) {
          case 'weapon': return <Sword size={size} className="text-gray-400" />;
          case 'armor': return <Shield size={size} className="text-gray-400" />;
          case 'potion': return <FlaskConical size={size} className="text-pink-400" />;
          case 'misc': default: return <Coins size={size} className="text-yellow-500" />;
      }
  };

  const renderCard = (item: Item) => (
    <div 
        key={item.id} 
        onClick={() => setSelectedItem(item)}
        className={`relative group cursor-pointer border-2 rounded-lg p-2 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95 bg-[#1a1510] ${item.rarity === 'legendary' ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : item.rarity === 'epic' ? 'border-purple-500' : item.rarity === 'rare' ? 'border-blue-500' : 'border-gray-600'}`}
    >
        <div className="w-12 h-12 bg-black/50 rounded flex items-center justify-center relative overflow-hidden">
            {renderItemIcon(item, 24)}
            {item.quantity > 1 && (
                <span className="absolute bottom-0 right-0 bg-gray-800 text-white text-[9px] px-1 rounded-tl border-l border-t border-gray-600">x{item.quantity}</span>
            )}
        </div>
        <span className="text-[10px] font-bold text-center leading-tight line-clamp-2 w-full h-6 flex items-center justify-center text-gray-200 group-hover:text-white">
            {item.name}
        </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full text-white animate-in fade-in duration-300">
      
      {/* --- ÁREA DE EQUIPAMENTOS --- */}
      <section className="mb-6">
        <h3 className="text-amber-500 font-bold text-[10px] uppercase tracking-widest mb-2 border-b border-amber-500/20 pb-1">Equipado</h3>
        <div className="flex gap-2 justify-center">
            
            {/* MÃO DIREITA (CLICÁVEL) */}
            <div 
                onClick={() => equippedWeapon && setSelectedItem(equippedWeapon)}
                className={`w-20 h-24 border border-dashed border-white/20 rounded flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden relative ${equippedWeapon ? 'cursor-pointer border-amber-500/50 shadow-md' : ''}`}
            >
                {equippedWeapon ? (
                    <>
                        <div className="absolute inset-0">{renderItemIcon(equippedWeapon)}</div>
                        <div className="absolute bottom-0 w-full bg-black/80 text-[8px] text-center py-1 truncate px-1 text-white font-bold">{equippedWeapon.name}</div>
                    </>
                ) : (
                    <><Sword size={16} className="opacity-20" /><span className="text-[8px] uppercase opacity-30">Arma</span></>
                )}
            </div>
            
            {/* ARMADURA (CLICÁVEL) */}
            <div 
                onClick={() => equippedArmor && setSelectedItem(equippedArmor)}
                className={`w-20 h-24 border border-dashed border-white/20 rounded flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden relative ${equippedArmor ? 'cursor-pointer border-amber-500/50 shadow-md' : ''}`}
            >
                {equippedArmor ? (
                    <>
                        <div className="absolute inset-0">{renderItemIcon(equippedArmor)}</div>
                        <div className="absolute bottom-0 w-full bg-black/80 text-[8px] text-center py-1 truncate px-1 text-white font-bold">{equippedArmor.name}</div>
                    </>
                ) : (
                    <><Shield size={16} className="opacity-20" /><span className="text-[8px] uppercase opacity-30">Torso</span></>
                )}
            </div>

            {/* MÃO ESQUERDA (Exemplo) */}
            <div className="w-20 h-24 border border-dashed border-white/20 rounded flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 transition-colors">
                <Hand size={16} className="opacity-20" /><span className="text-[8px] uppercase opacity-30">Mão Esq.</span>
            </div>
        </div>
      </section>

      {/* --- MOCHILA (GRID) --- */}
      <section className="flex-grow overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
            <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Mochila ({backpackItems.length})</h3>
        </div>
        
        {backpackItems.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-xs italic">A mochila está vazia...</div>
        ) : (
            <div className="grid grid-cols-3 gap-2">
                {backpackItems.map(item => renderCard(item))}
            </div>
        )}
      </section>

      {/* --- MODAL DE DETALHES DO ITEM --- */}
      {selectedItem && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col p-6 animate-in zoom-in duration-200">
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
              
              <div className="flex flex-col items-center mt-4 mb-6">
                  <div className={`w-32 h-32 rounded-xl border-2 flex items-center justify-center mb-4 bg-[#1a1510] overflow-hidden ${selectedItem.rarity === 'legendary' ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'border-gray-500'}`}>
                    {renderItemIcon(selectedItem, 48)}
                  </div>
                  <h2 className="text-xl font-serif text-white font-bold text-center">{selectedItem.name}</h2>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${selectedItem.rarity === 'legendary' ? 'text-yellow-500' : 'text-gray-500'}`}>{selectedItem.rarity} • {selectedItem.type}</span>
              </div>

              <div className="bg-white/5 p-4 rounded-lg mb-6 flex-grow overflow-y-auto custom-scrollbar">
                  <p className="text-sm text-gray-300 italic mb-4">"{selectedItem.description || 'Um item misterioso sem descrição...'}"</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                      {selectedItem.value && (
                          <div className="bg-black/40 p-2 rounded border border-white/5 flex justify-between items-center">
                              <span className="text-[10px] text-yellow-500 uppercase">Valor</span>
                              <span className="text-yellow-200 font-mono font-bold text-xs">{selectedItem.value}</span>
                          </div>
                      )}

                      {selectedItem.stats && Object.entries(selectedItem.stats).map(([key, val]) => (
                          <div key={key} className="bg-black/40 p-2 rounded border border-white/5 flex justify-between items-center">
                              <span className="text-[10px] text-gray-500 uppercase">{key === 'ac' ? 'CA' : key === 'damage' ? 'Dano' : key}</span>
                              <span className="text-white font-mono font-bold text-xs">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => { if(onEquip) onEquip(selectedItem); setSelectedItem(null); }} 
                    className={`flex-1 py-3 rounded font-bold text-xs uppercase tracking-widest transition-all text-white border ${selectedItem.isEquipped ? 'bg-amber-900/50 hover:bg-amber-700 border-amber-500/30' : 'bg-blue-900/50 hover:bg-blue-600 border-blue-500/30'}`}
                  >
                      {selectedItem.isEquipped ? 'Desequipar' : (selectedItem.type === 'potion' ? 'Beber' : 'Equipar')}
                  </button>
                  
                  {!selectedItem.isEquipped && (
                    <button onClick={() => { if(onDrop) onDrop(selectedItem); setSelectedItem(null); }} className="w-12 bg-red-900/30 hover:bg-red-600/50 border border-red-500/30 text-red-200 rounded flex items-center justify-center transition-all">
                        <Trash2 size={16} />
                    </button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;