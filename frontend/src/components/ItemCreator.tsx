import React, { useState, useRef } from 'react';
import { Package, Plus, Upload } from 'lucide-react';
import { Item } from '../App';

interface ItemCreatorProps {
  onCreateItem: (item: Item) => void;
  targetName?: string;
}

const RARITY_COLORS = {
  common: 'border-gray-500 text-gray-400',
  rare: 'border-blue-500 text-blue-400',
  epic: 'border-purple-500 text-purple-400',
  legendary: 'border-yellow-500 text-yellow-400',
};

const ITEM_TYPES = [
  { id: 'weapon', label: 'Arma', icon: '⚔️' },
  { id: 'armor', label: 'Armadura', icon: '🛡️' },
  { id: 'potion', label: 'Poção', icon: '🧪' },
  { id: 'misc', label: 'Item/Ouro', icon: '💰' },
];

const ItemCreator: React.FC<ItemCreatorProps> = ({ onCreateItem, targetName }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<Item['type']>('weapon');
  const [rarity, setRarity] = useState<Item['rarity']>('common');
  
  // Separamos os estados: um para o atributo de combate e outro para o preço
  const [statValue, setStatValue] = useState(''); // Dano, CA ou Cura
  const [cost, setCost] = useState('');           // Valor em Ouro (ex: 10 PO)
  
  const [desc, setDesc] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [itemImage, setItemImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setItemImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: Item = {
      id: Date.now().toString(),
      name,
      description: desc,
      type,
      rarity,
      quantity,
      image: itemImage || '',
      value: cost, // Campo genérico de valor/preço
      stats: {}
    };

    // Configura os stats específicos baseados no tipo
    if (type === 'weapon') newItem.stats = { damage: statValue || '1d6' };
    if (type === 'armor') newItem.stats = { ac: parseInt(statValue) || 10 };
    if (type === 'potion') newItem.stats = { properties: ['heal', statValue || '1d4'] };
    // Misc não precisa de stats de combate, apenas o valor em ouro

    onCreateItem(newItem);
    
    // Reset do formulário
    setName('');
    setDesc('');
    setStatValue('');
    setCost('');
    setQuantity(1);
    setItemImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Define o placeholder do campo de ATRIBUTO (não do valor)
  const getStatPlaceholder = () => {
    switch (type) {
      case 'weapon': return 'Dano (ex: 1d8+2)';
      case 'armor': return 'CA (ex: 16)';
      case 'potion': return 'Cura/Efeito (ex: 2d4+2)';
      case 'misc': return 'Efeito (Opcional)';
      default: return 'Atributo';
    }
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="text-amber-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <Package size={14} /> Forjar Item
        </h3>
        {targetName ? (
            <span className="text-[10px] text-green-400 bg-green-900/30 px-2 py-0.5 rounded border border-green-500/30">
                Para: {targetName}
            </span>
        ) : (
            <span className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-500/30">
                Sem Alvo Selecionado
            </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* NOME */}
        <input 
          type="text" 
          placeholder="Nome do Item (Ex: Espada Vorpal)" 
          className="w-full bg-black/50 border-b border-white/20 p-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {/* TIPO E RARIDADE */}
        <div className="flex gap-2">
            <div className="flex-1 grid grid-cols-4 gap-1">
                {ITEM_TYPES.map(t => (
                    <button 
                        key={t.id} 
                        type="button"
                        onClick={() => setType(t.id as any)}
                        className={`p-1.5 rounded border flex items-center justify-center transition-all ${type === t.id ? 'bg-white/20 border-white' : 'bg-transparent border-white/10 hover:bg-white/5'}`}
                        title={t.label}
                    >
                        {t.icon}
                    </button>
                ))}
            </div>
            <select 
                value={rarity} 
                onChange={(e) => setRarity(e.target.value as any)}
                className={`w-24 bg-black/50 border text-[10px] font-bold uppercase rounded outline-none p-1 ${RARITY_COLORS[rarity || 'common']}`}
            >
                <option value="common">Comum</option>
                <option value="rare">Raro</option>
                <option value="epic">Épico</option>
                <option value="legendary">Lendário</option>
            </select>
        </div>

        {/* UPLOAD DE IMAGEM */}
        <div 
          className="w-full h-20 border border-dashed border-white/20 rounded bg-black/30 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 hover:bg-white/5 transition-all overflow-hidden relative group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          {itemImage ? (
            <>
                <img src={itemImage} alt="Preview" className="h-full w-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white font-bold uppercase">Alterar Imagem</span>
                </div>
            </>
          ) : (
            <>
                <Upload size={16} className="text-gray-500 mb-1" />
                <span className="text-[10px] text-gray-500 uppercase font-bold">Imagem do Item</span>
            </>
          )}
        </div>

        {/* ATRIBUTOS ESPECÍFICOS (Linha 1) */}
        <div className="flex gap-2">
            {/* Campo de Atributo (Dano/CA/Cura) - Só aparece se não for 'misc' ou se quiser opcional */}
            <input 
              type="text" 
              placeholder={getStatPlaceholder()}
              className="flex-[2] bg-black/50 border border-white/10 rounded p-2 text-xs text-white outline-none focus:border-blue-500"
              value={statValue}
              onChange={e => setStatValue(e.target.value)}
            />
            
            {/* Campo de Quantidade */}
            <div className="flex items-center border border-white/10 rounded bg-black/50">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-2 text-gray-400 hover:text-white">-</button>
                <span className="text-xs font-mono w-6 text-center">{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)} className="px-2 text-gray-400 hover:text-white">+</button>
            </div>
        </div>

        {/* VALOR MONETÁRIO (Linha 2 - Separado) */}
        <div className="flex items-center bg-black/30 border border-yellow-900/30 rounded px-2">
            <span className="text-yellow-500 mr-2">💰</span>
            <input 
                type="text"
                placeholder="Valor (ex: 150 PO)"
                className="w-full bg-transparent border-none p-2 text-xs text-yellow-100 placeholder-yellow-500/30 outline-none"
                value={cost}
                onChange={e => setCost(e.target.value)}
            />
        </div>

        {/* DESCRIÇÃO */}
        <textarea 
            placeholder="Descrição curta e efeitos..." 
            className="w-full bg-black/50 border border-white/10 rounded p-2 text-xs text-gray-300 h-16 resize-none outline-none focus:border-amber-500/50 custom-scrollbar"
            value={desc}
            onChange={e => setDesc(e.target.value)}
        />

        {/* BOTÃO CRIAR */}
        <button 
            type="submit" 
            disabled={!targetName || !name}
            className="w-full py-2 bg-gradient-to-r from-amber-700 to-amber-900 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded border border-amber-500/30 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
        >
            <Plus size={14} /> Forjar & Entregar
        </button>
      </form>
    </div>
  );
};

export default ItemCreator;