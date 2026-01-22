import React, { useState } from 'react';

interface Item {
  id: number;
  name: string;
  type: string;
  rarity: 'Comum' | 'Incomum' | 'Raro' | 'Lendário';
  description: string;
}

const ItemCreator = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Partial<Item>>({ rarity: 'Comum' });

  const handleSave = () => {
    if (!newItem.name || !newItem.description) return;
    setItems([...items, { ...newItem, id: Date.now() } as Item]);
    setNewItem({ name: '', type: '', rarity: 'Comum', description: '' }); 
  };

  return (
    <div className="w-full p-6 bg-[#15151a] border border-white/10 rounded-xl">
      <h3 className="text-xl text-purple-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
         <span className="text-2xl">⚒️</span> Forja do Mestre
      </h3>
      
      {/* FORMULÁRIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input 
          placeholder="Nome do Item" 
          value={newItem.name || ''}
          onChange={e => setNewItem({...newItem, name: e.target.value})}
          className="bg-black/50 border border-gray-700 p-3 rounded text-white focus:border-purple-500 outline-none transition-colors"
        />
        <select 
          value={newItem.rarity}
          onChange={e => setNewItem({...newItem, rarity: e.target.value as any})}
          className="bg-black/50 border border-gray-700 p-3 rounded text-white focus:border-purple-500 outline-none"
        >
          <option>Comum</option>
          <option>Incomum</option>
          <option>Raro</option>
          <option>Lendário</option>
        </select>
        <input 
          placeholder="Tipo (ex: Espada Longa, Poção)" 
          value={newItem.type || ''}
          onChange={e => setNewItem({...newItem, type: e.target.value})}
          className="bg-black/50 border border-gray-700 p-3 rounded text-white focus:border-purple-500 outline-none md:col-span-2"
        />
        <textarea 
          placeholder="Descrição e Efeitos Mágicos..." 
          value={newItem.description || ''}
          onChange={e => setNewItem({...newItem, description: e.target.value})}
          className="bg-black/50 border border-gray-700 p-3 rounded text-white focus:border-purple-500 outline-none md:col-span-2 h-24"
        />
        <button 
          onClick={handleSave}
          className="md:col-span-2 py-3 bg-gradient-to-r from-purple-700 to-indigo-800 rounded font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(126,34,206,0.3)] text-white uppercase tracking-widest text-xs"
        >
          Forjar Item
        </button>
      </div>

      {/* LISTA DE ITENS CRIADOS */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="p-4 bg-black/40 border border-white/5 rounded flex justify-between items-center group hover:border-white/20 transition-colors">
            <div>
              <h4 className={`font-bold ${item.rarity === 'Lendário' ? 'text-orange-400 drop-shadow-md' : item.rarity === 'Raro' ? 'text-blue-400' : 'text-white'}`}>
                {item.name}
              </h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.rarity} • {item.type}</p>
              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
            </div>
            <button className="text-red-900 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" onClick={() => setItems(items.filter(i => i.id !== item.id))}>✕</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-700 text-center text-xs italic py-4">A forja está fria. Nenhum item criado.</p>}
      </div>
    </div>
  );
};

export default ItemCreator;