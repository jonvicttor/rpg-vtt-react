import React, { useState, useRef } from 'react';
import { Entity } from '../App';

interface EditEntityModalProps {
  entity: Entity;
  onSave: (id: number, updates: Partial<Entity>) => void;
  onClose: () => void;
}

const EditEntityModal: React.FC<EditEntityModalProps> = ({ entity, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: entity.name,
    hp: entity.hp,
    maxHp: entity.maxHp,
    ac: entity.ac,
    size: entity.size || 1, // --- NOVO: Estado para o tamanho ---
    image: entity.image || '',
    stats: entity.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('stat-')) {
      const statName = name.replace('stat-', '');
      setFormData(prev => ({
        ...prev,
        stats: { ...prev.stats, [statName]: parseInt(value) || 0 }
      }));
    } else if (name === 'size') {
      // Garante que o tamanho seja tratado como número decimal/inteiro
      setFormData(prev => ({ ...prev, size: parseFloat(value) || 1 }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: name === 'name' ? value : parseInt(value) || 0 
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/png');
            setFormData(prev => ({ ...prev, image: compressedBase64 }));
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(entity.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <form onSubmit={handleSubmit} className="bg-rpgPanel border border-rpgAccent/30 p-6 rounded-lg shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
        <h2 className="text-rpgAccent font-bold uppercase mb-4 border-b border-white/10 pb-2">Editar: {entity.name || 'Novo Aliado'}</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-[10px] text-gray-400 uppercase mb-1">Nome</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 uppercase mb-1">HP Atual</label>
            <input type="number" name="hp" value={formData.hp} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 uppercase mb-1">HP Máximo</label>
            <input type="number" name="maxHp" value={formData.maxHp} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* --- NOVO: SELETOR DE TAMANHO --- */}
        <div className="mb-4">
          <label className="block text-[10px] text-gray-400 uppercase mb-1 font-bold">Tamanho da Criatura (Grid)</label>
          <select 
            name="size" 
            value={formData.size} 
            onChange={handleChange}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="0.5">Miúdo (1.5x1.5)</option>
            <option value="1">Médio (2x2)</option>
            <option value="2">Grande (3x3)</option>
            <option value="3">Enorme (4x4)</option>
            <option value="4">Imenso (5x5)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] text-rpgAccent uppercase mb-2 font-bold tracking-widest">Atributos Base</label>
          <div className="grid grid-cols-3 gap-2 bg-black/20 p-3 rounded border border-white/5">
            {Object.entries(formData.stats).map(([stat, value]) => (
              <div key={stat} className="flex flex-col">
                <label className="text-[9px] text-gray-500 uppercase text-center">{stat}</label>
                <input 
                  type="number" 
                  name={`stat-${stat}`} 
                  value={value} 
                  onChange={handleChange} 
                  className="bg-black/60 border border-white/10 rounded text-center text-xs py-1 text-blue-400 focus:border-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-[10px] text-gray-400 uppercase mb-2 font-bold">Imagem (Token)</label>
          <div 
            className="w-full h-20 border-2 border-dashed border-white/10 rounded bg-black/40 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden group relative"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            {formData.image ? (
              <>
                <img src={formData.image} alt="Preview" className="h-full w-auto object-contain transition-opacity group-hover:opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded">TROCAR IMAGEM</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-500 group-hover:text-blue-400">
                <span className="text-xl">📷</span>
                <span className="text-[9px] uppercase font-bold">Clique para Upload</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors uppercase font-bold">Cancelar</button>
          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs uppercase shadow-lg transition-all border border-blue-400/30">Salvar Aliado</button>
        </div>
      </form>
    </div>
  );
};

export default EditEntityModal;