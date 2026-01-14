import React, { useState, useEffect } from 'react';

// --- DADOS DE REGRAS (D&D 5E COMPLETO) ---
const RACES = {
  'HUMANO':    { bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, desc: '+1 em Todos' },
  'ANAO':      { bonus: { str: 0, dex: 0, con: 2, int: 0, wis: 0, cha: 0 }, desc: '+2 Constituição' },
  'ELFO':      { bonus: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, desc: '+2 Destreza' },
  'HALFLING':  { bonus: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, desc: '+2 Destreza' },
  'DRACONATO': { bonus: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 1 }, desc: '+2 Força, +1 Carisma' },
  'GNOMO':     { bonus: { str: 0, dex: 0, con: 0, int: 2, wis: 0, cha: 0 }, desc: '+2 Inteligência' },
  'MEIO-ELFO': { bonus: { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 2 }, desc: '+2 Carisma, +1 Dex/Con' },
  'MEIO-ORC':  { bonus: { str: 2, dex: 0, con: 1, int: 0, wis: 0, cha: 0 }, desc: '+2 Força, +1 Cons.' },
  'TIEFLING':  { bonus: { str: 0, dex: 0, con: 0, int: 1, wis: 0, cha: 2 }, desc: '+2 Carisma, +1 Int.' },
};

// Agora com as 12 Classes + Assassino
const CLASSES = {
  'BARBARO':     { hpBase: 12, image: '/tokens/barbaro.png', ac: 14, icon: '🪓' },
  'BARDO':       { hpBase: 8,  image: '/tokens/bardo.png',   ac: 13, icon: '🎵' },
  'CLERIGO':     { hpBase: 8,  image: '/tokens/clerigo.png', ac: 18, icon: '✨' },
  'DRUIDA':      { hpBase: 8,  image: '/tokens/druida.png',  ac: 14, icon: '🌿' },
  'GUERREIRO':   { hpBase: 10, image: '/tokens/guerreiro.png', ac: 16, icon: '⚔️' },
  'MONGE':       { hpBase: 8,  image: '/tokens/monge.png',   ac: 15, icon: '👊' },
  'PALADINO':    { hpBase: 10, image: '/tokens/paladino.png', ac: 18, icon: '🛡️' },
  'ARQUEIRO':    { hpBase: 10, image: '/tokens/patrulheiro.png', ac: 15, icon: '🏹' }, // Renomeado de PATRULHEIRO
  'ASSASSINO':   { hpBase: 8,  image: '/tokens/ladino.png',  ac: 14, icon: '🗡️' },
  'FEITICEIRO':  { hpBase: 6,  image: '/tokens/feiticeiro.png', ac: 12, icon: '🔥' },
  'BRUXO':       { hpBase: 8,  image: '/tokens/bruxo.png',   ac: 13, icon: '👁️' },
  'MAGO':        { hpBase: 6,  image: '/tokens/mago.png',    ac: 12, icon: '🔮' },
};

// --- CORREÇÃO DO ERRO DE EXPORTAÇÃO ---
export type ClassType = keyof typeof CLASSES;

// Tabela de Custo (Point Buy)
const POINT_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

interface LoginScreenProps {
  onLogin: (role: 'DM' | 'PLAYER', name: string, charData?: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'DM' | 'PLAYER'>('PLAYER');
  const [name, setName] = useState('');
  const [dmPass, setDmPass] = useState('');
  const [error, setError] = useState('');

  const [selectedRace, setSelectedRace] = useState<keyof typeof RACES>('HUMANO');
  const [selectedClass, setSelectedClass] = useState<keyof typeof CLASSES>('GUERREIRO');
  
  const [stats, setStats] = useState({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
  const [pointsLeft, setPointsLeft] = useState(27);

  // --- NOVO ESTADO PARA O MODAL DE IMAGEM ---
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    let used = 0;
    Object.values(stats).forEach(val => {
      used += POINT_COST[val] || 0;
    });
    setPointsLeft(27 - used);
  }, [stats]);

  const handleStatChange = (attr: keyof typeof stats, increment: boolean) => {
    const currentVal = stats[attr];
    const nextVal = increment ? currentVal + 1 : currentVal - 1;

    if (nextVal < 8 || nextVal > 15) return;

    const currentCost = POINT_COST[currentVal];
    const nextCost = POINT_COST[nextVal];
    const diff = nextCost - currentCost;

    if (increment && pointsLeft - diff < 0) return;

    setStats(prev => ({ ...prev, [attr]: nextVal }));
  };

  // --- FUNÇÃO: GERA O NOME DO ARQUIVO ---
  const getDynamicTokenImage = (raceStr: string, classStr: string) => {
    const cleanStr = (str: string) => 
      str.toLowerCase()
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "") 
         .replace("-", "") 
         .replace(" ", ""); 

    const r = cleanStr(raceStr);
    const c = cleanStr(classStr);

    return `/tokens/${r}_${c}.png`;
  };

  const calculateFinalData = () => {
    const racial = RACES[selectedRace].bonus;
    const finalStats = {
      str: stats.str + racial.str,
      dex: stats.dex + racial.dex,
      con: stats.con + racial.con,
      int: stats.int + racial.int,
      wis: stats.wis + racial.wis,
      cha: stats.cha + racial.cha
    };

    const conMod = Math.floor((finalStats.con - 10) / 2);
    const hpMax = Math.max(1, CLASSES[selectedClass].hpBase + conMod);

    return {
      stats: finalStats,
      hp: hpMax,
      maxHp: hpMax,
      ac: CLASSES[selectedClass].ac,
      image: getDynamicTokenImage(selectedRace, selectedClass), 
      race: selectedRace,
      classType: selectedClass
    };
  };

  const handleFinalSubmit = () => {
    if (role === 'DM') {
      if (dmPass === 'admin123') onLogin('DM', 'Mestre Supremo');
      else setError('Senha Incorreta!');
    } else {
      if (!name.trim()) { setError('Nome é obrigatório!'); return; }
      const charData = calculateFinalData();
      onLogin('PLAYER', name, charData);
    }
  };

  // --- RENDERIZADORES ---

  if (step === 1) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center bg-[url('https://i.pinimg.com/originals/26/16/83/261683935d25e79603099951d1822839.gif')] bg-cover">
        <div className="bg-gray-900/90 p-8 rounded-xl border border-white/10 backdrop-blur-md w-96 text-center shadow-2xl">
          <h1 className="text-4xl font-bold text-yellow-500 mb-6 font-mono tracking-widest">RPG VTT</h1>
          <div className="flex flex-col gap-4">
            <button onClick={() => { setRole('PLAYER'); setStep(2); }} className="py-4 bg-blue-900/60 hover:bg-blue-600 border border-blue-500/50 rounded text-blue-100 font-bold uppercase transition-all hover:scale-105">Sou Jogador</button>
            <button onClick={() => { setRole('DM'); setStep(2); }} className="py-4 bg-red-900/60 hover:bg-red-600 border border-red-500/50 rounded text-red-100 font-bold uppercase transition-all hover:scale-105">Sou o Mestre</button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'DM') {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded border border-red-500 w-80 text-center">
          <h2 className="text-red-500 font-bold mb-4">AREA RESTRITA</h2>
          <input type="password" placeholder="Senha" className="w-full p-2 bg-black border border-gray-700 text-white rounded mb-4 text-center" value={dmPass} onChange={e => setDmPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFinalSubmit()} autoFocus />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <button onClick={handleFinalSubmit} className="w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded font-bold">ENTRAR</button>
          <button onClick={() => setStep(1)} className="mt-4 text-gray-500 text-xs hover:text-white">Voltar</button>
        </div>
      </div>
    );
  }

  // --- PREVIEW DO TOKEN DINÂMICO ---
  const tokenPreviewUrl = getDynamicTokenImage(selectedRace, selectedClass);

  return (
    <>
      {/* --- MODAL DE IMAGEM FULL SCREEN --- */}
      {showFullImage && (
        <div 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setShowFullImage(false)}
        >
            <div className="relative max-w-[90vh] max-h-[90vh] flex flex-col items-center">
                <img 
                    src={tokenPreviewUrl} 
                    alt="Full Preview" 
                    className="max-w-full max-h-[80vh] object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] rounded-lg"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/tokens/aliado.png';
                    }}
                />
                <div className="mt-4 text-center">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-widest">{selectedRace} {selectedClass}</h3>
                    <p className="text-gray-400 font-mono text-xs mt-1">Clique em qualquer lugar para fechar</p>
                </div>
            </div>
        </div>
      )}

      <div className="w-screen h-screen bg-black flex items-center justify-center text-white overflow-hidden font-sans bg-[url('https://i.pinimg.com/originals/97/34/40/9734407b46d69db3470728c7c933923a.jpg')] bg-cover">
        <div className="bg-gray-900/95 w-[900px] h-[650px] rounded-xl border border-blue-500/30 shadow-2xl flex flex-col relative">
          
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
            <h2 className="text-xl font-bold text-blue-400 tracking-wider">CRIAR PERSONAGEM</h2>
            <div className="flex gap-2">
              <div className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
              <div className={`w-3 h-3 rounded-full ${step === 3 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
            </div>
          </div>

          {step === 2 && (
            <div className="p-8 flex flex-col gap-6 flex-grow overflow-y-auto custom-scrollbar">
              <div className="flex gap-6 items-end">
                  <div className="flex-grow">
                      <label className="text-xs text-gray-400 uppercase font-bold">Nome do Herói</label>
                      <input autoFocus type="text" className="w-full bg-black/50 border border-blue-500/30 p-3 rounded text-xl text-white focus:border-blue-500 outline-none" placeholder="Ex: Aragorn" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  {/* PREVIEW DA IMAGEM (CLICÁVEL) */}
                  <div 
                    className="flex flex-col items-center cursor-pointer group hover:scale-105 transition-transform"
                    onClick={() => setShowFullImage(true)} // Abre o Modal
                    title="Clique para ampliar"
                  >
                      <span className="text-[10px] text-gray-500 uppercase mb-1 group-hover:text-blue-400 transition-colors">🔍 Preview</span>
                      <div className="w-16 h-16 rounded-full border-2 border-blue-500 overflow-hidden bg-black shadow-lg group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
                          <img 
                              src={tokenPreviewUrl} 
                              alt="Token" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/tokens/aliado.png'; 
                              }}
                          />
                      </div>
                      <span className="text-[8px] text-gray-600 font-mono mt-1 max-w-[80px] truncate">{tokenPreviewUrl.split('/').pop()}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* RAÇAS */}
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Raça</label>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(RACES).map(r => (
                      <button key={r} onClick={() => setSelectedRace(r as any)} className={`p-3 rounded text-left border transition-all ${selectedRace === r ? 'bg-blue-900/50 border-blue-400 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}`}>
                        <div className="font-bold text-sm">{r}</div>
                        <div className="text-[10px] opacity-70">
                          {/* @ts-ignore */}
                          {RACES[r].desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CLASSES */}
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Classe</label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {Object.keys(CLASSES).map(c => (
                      <button key={c} onClick={() => setSelectedClass(c as any)} className={`p-2 rounded border flex flex-col items-center justify-center transition-all ${selectedClass === c ? 'bg-purple-900/50 border-purple-400 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}`}>
                        {/* @ts-ignore */}
                        <div className="text-2xl mb-1">{CLASSES[c].icon}</div>
                        <div className="font-bold text-[9px] uppercase">{c}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 bg-black/40 p-3 rounded border border-white/5 text-xs text-gray-400">
                    <p>HP Base: <span className="text-white font-bold">{CLASSES[selectedClass].hpBase}</span> + CON</p>
                    <p>Defesa (AC): <span className="text-white font-bold">{CLASSES[selectedClass].ac}</span></p>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex justify-end pt-4">
                <button onClick={() => { if(name) setStep(3); else setError('Nome obrigatório!'); }} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition-all">DISTRIBUIR PONTOS ➜</button>
              </div>
              {error && <p className="text-red-500 text-sm absolute bottom-4 left-8">{error}</p>}
            </div>
          )}

          {step === 3 && (
            <div className="p-8 flex flex-col h-full">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">Distribua seus Pontos</h3>
                <div className={`text-5xl font-mono font-bold mt-2 ${pointsLeft < 0 ? 'text-red-500' : 'text-yellow-400'} drop-shadow-md`}>{pointsLeft}</div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Pontos Disponíveis (27 Máx)</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {Object.keys(stats).map((key) => {
                  const attr = key as keyof typeof stats;
                  // @ts-ignore
                  const racialBonus = RACES[selectedRace].bonus[attr];
                  const total = stats[attr] + racialBonus;
                  const mod = Math.floor((total - 10) / 2);

                  return (
                    <div key={attr} className="bg-gray-800/60 p-3 rounded border border-white/10 flex flex-col items-center relative group hover:border-blue-500/50 transition-colors">
                      <span className="text-xs text-gray-400 uppercase font-bold mb-2 tracking-wider">{attr}</span>
                      
                      <div className="flex items-center gap-4 bg-black/40 p-1 rounded-full border border-white/5">
                        <button onClick={() => handleStatChange(attr, false)} className="w-8 h-8 flex items-center justify-center bg-red-900/30 hover:bg-red-600 rounded-full text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all" disabled={stats[attr] <= 8}>-</button>
                        <span className="text-xl font-bold font-mono w-6 text-center text-white">{stats[attr]}</span>
                        <button onClick={() => handleStatChange(attr, true)} className="w-8 h-8 flex items-center justify-center bg-green-900/30 hover:bg-green-600 rounded-full text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all" disabled={stats[attr] >= 15 || pointsLeft <= 0}>+</button>
                      </div>

                      <div className="mt-3 text-[10px] text-gray-500 flex justify-between w-full px-4 border-t border-white/5 pt-2">
                        <span>Racial: <span className={racialBonus > 0 ? "text-green-400 font-bold" : "text-gray-600"}>+{racialBonus}</span></span>
                        <span className="font-bold text-white">Total: {total}</span>
                      </div>
                      
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-black border border-yellow-600 rounded-full flex items-center justify-center text-yellow-500 font-bold font-mono text-sm shadow-lg z-10">
                        {mod >= 0 ? `+${mod}` : mod}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto flex justify-between items-center border-t border-white/10 pt-6">
                <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">← Voltar</button>
                <div className="text-right flex flex-col items-end">
                   <p className="text-[10px] text-gray-500 mb-2 font-mono uppercase">Resumo: {selectedRace} {selectedClass} {calculateFinalData().hp}HP</p>
                   <button onClick={handleFinalSubmit} className="px-10 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg transition-all animate-pulse tracking-wider">CRIAR PERSONAGEM</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default LoginScreen;