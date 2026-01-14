import React, { useState } from 'react';
import { Entity } from '../App';

interface EditEntityModalProps {
  entity: Entity;
  onSave: (id: number, updates: Partial<Entity>) => void;
  onClose: () => void;
}

const EditEntityModal: React.FC<EditEntityModalProps> = ({ entity, onSave, onClose }) => {
  // Estado local para o formulário
  const [name, setName] = useState(entity.name);
  const [maxHp, setMaxHp] = useState(entity.maxHp);
  const [currentHp, setCurrentHp] = useState(entity.hp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(entity.id, {
      name,
      maxHp: Number(maxHp),
      hp: Number(currentHp)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-rpgPanel border border-rpgAccent p-6 rounded-lg w-80 shadow-[0_0_20px_rgba(107,33,168,0.3)]">
        <h2 className="text-rpgAccent font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
          Editar Entidade
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nome */}
          <div>
            <label className="text-[10px] text-rpgText/70 uppercase font-mono">Nome</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:border-rpgAccent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* HP Atual */}
            <div>
              <label className="text-[10px] text-rpgText/70 uppercase font-mono">HP Atual</label>
              <input 
                type="number" 
                value={currentHp}
                onChange={(e) => setCurrentHp(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:border-rpgAccent outline-none"
              />
            </div>

            {/* HP Máximo */}
            <div>
              <label className="text-[10px] text-rpgText/70 uppercase font-mono">HP Máx</label>
              <input 
                type="number" 
                value={maxHp}
                onChange={(e) => setMaxHp(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:border-rpgAccent outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-transparent border border-white/20 text-white/50 hover:text-white hover:border-white text-xs font-bold py-2 rounded transition-colors"
            >
              CANCELAR
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-rpgAccent hover:bg-rpgAccent/80 text-white text-xs font-bold py-2 rounded shadow-lg transition-transform active:scale-95"
            >
              SALVAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEntityModal;