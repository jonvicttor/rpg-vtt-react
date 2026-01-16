import React, { useState, useEffect } from 'react';

// --- DADOS DE REGRAS ---
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

const CLASSES = {
  'BARBARO':    { hpBase: 12, image: '/tokens/barbaro.png', ac: 14, icon: '🪓' },
  'BARDO':       { hpBase: 8,  image: '/tokens/bardo.png',   ac: 13, icon: '🎵' },
  'CLERIGO':     { hpBase: 8,  image: '/tokens/clerigo.png', ac: 18, icon: '✨' },
  'DRUIDA':      { hpBase: 8,  image: '/tokens/druida.png',  ac: 14, icon: '🌿' },
  'GUERREIRO':   { hpBase: 10, image: '/tokens/guerreiro.png', ac: 16, icon: '⚔️' },
  'MONGE':       { hpBase: 8,  image: '/tokens/monge.png',   ac: 15, icon: '👊' },
  'PALADINO':    { hpBase: 10, image: '/tokens/paladino.png', ac: 18, icon: '🛡️' },
  'ARQUEIRO':    { hpBase: 10, image: '/tokens/arqueiro.png', ac: 15, icon: '🏹' },
  'ASSASSINO':   { hpBase: 8,  image: '/tokens/assassino.png',  ac: 14, icon: '🗡️' },
  'FEITICEIRO':  { hpBase: 6,  image: '/tokens/feiticeiro.png', ac: 12, icon: '🔥' },
  'BRUXO':       { hpBase: 8,  image: '/tokens/bruxo.png',   ac: 13, icon: '👁️' },
  'MAGO':        { hpBase: 6,  image: '/tokens/mago.png',    ac: 12, icon: '🔮' },
};

const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

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
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    let used = 0;
    Object.values(stats).forEach(val => { used += POINT_COST[val] || 0; });
    setPointsLeft(27 - used);
  }, [stats]);

  const handleStatChange = (attr: keyof typeof stats, increment: boolean) => {
    const nextVal = increment ? stats[attr] + 1 : stats[attr] - 1;
    if (nextVal < 8 || nextVal > 15) return;
    const diff = POINT_COST[nextVal] - POINT_COST[stats[attr]];
    if (increment && pointsLeft - diff < 0) return;
    setStats(prev => ({ ...prev, [attr]: nextVal }));
  };

  const getDynamicTokenImage = (raceStr: string, classStr: string) => {
    const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-\s]/g, "");
    return `/tokens/${clean(raceStr)}_${clean(classStr)}.png`;
  };

  const calculateFinalData = () => {
    const racial = RACES[selectedRace].bonus;
    const finalStats = { str: stats.str + racial.str, dex: stats.dex + racial.dex, con: stats.con + racial.con, int: stats.int + racial.int, wis: stats.wis + racial.wis, cha: stats.cha + racial.cha };
    const conMod = Math.floor((finalStats.con - 10) / 2);
    const hpMax = Math.max(1, CLASSES[selectedClass].hpBase + conMod);
    return { stats: finalStats, hp: hpMax, maxHp: hpMax, ac: CLASSES[selectedClass].ac, image: getDynamicTokenImage(selectedRace, selectedClass), race: selectedRace, classType: selectedClass };
  };

  const handleFinalSubmit = () => {
    if (role === 'DM') {
      if (dmPass === 'admin123') onLogin('DM', 'Mestre Supremo');
      else setError('Senha Incorreta!');
    } else {
      if (!name.trim()) { setError('Nome é obrigatório!'); return; }
      onLogin('PLAYER', name, calculateFinalData());
    }
  };

  // Base da Tela com a Imagem de Fundo (Certifique-se de salvar em public/login-bg.jpg)
  const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden bg-black font-serif" style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      <div className="relative z-10">{children}</div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');`}</style>
    </div>
  );

  // Step 1: Seleção Inicial
  if (step === 1) {
    return (
      <BackgroundWrapper>
        <div className="relative p-1 group">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/50 via-blue-500/20 to-purple-500/50 rounded-lg blur-sm group-hover:blur-md transition-all"></div>
          <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 p-10 rounded-lg shadow-2xl w-96 flex flex-col items-center gap-8">
            <div className="text-center">
              <h1 className="text-5xl text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 font-bold tracking-widest drop-shadow-2xl" style={{ fontFamily: 'Cinzel, serif' }}>NEXUS</h1>
              <span className="text-purple-300 tracking-[0.5em] text-[10px] uppercase font-bold opacity-80">Sistema de RPG</span>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <button onClick={() => { setRole('PLAYER'); setStep(2); }} className="py-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-600 hover:to-blue-600 border border-purple-500/30 rounded text-amber-100 font-bold uppercase transition-all hover:scale-105 tracking-widest shadow-lg">Sou Jogador</button>
              <button onClick={() => { setRole('DM'); setStep(2); }} className="py-4 bg-gradient-to-r from-amber-900/40 to-red-900/40 hover:from-amber-600 hover:to-red-600 border border-amber-500/30 rounded text-amber-100 font-bold uppercase transition-all hover:scale-105 tracking-widest shadow-lg">Sou o Mestre</button>
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  // Step 2: Criação de Personagem ou Login DM
  if (role === 'DM') {
    return (
      <BackgroundWrapper>
        <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 p-10 rounded-lg shadow-2xl w-96 text-center">
          <h2 className="text-amber-500 font-bold mb-6 tracking-widest uppercase" style={{ fontFamily: 'Cinzel' }}>Acesso do Mestre</h2>
          <input type="password" placeholder="Senha Arcaica" className="w-full p-3 bg-gray-900/80 border border-amber-500/20 text-amber-100 rounded mb-4 text-center outline-none focus:border-amber-500 transition-colors" value={dmPass} onChange={e => setDmPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFinalSubmit()} autoFocus />
          {error && <p className="text-red-400 text-xs mb-4 animate-pulse">{error}</p>}
          <button onClick={handleFinalSubmit} className="w-full bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 py-3 rounded font-bold tracking-widest hover:brightness-125 transition-all">ENTRAR NO REINO</button>
          <button onClick={() => setStep(1)} className="mt-6 text-purple-300/50 text-xs hover:text-purple-300 transition-colors uppercase tracking-widest">❮ Voltar</button>
        </div>
      </BackgroundWrapper>
    );
  }

  const tokenPreviewUrl = getDynamicTokenImage(selectedRace, selectedClass);

  return (
    <BackgroundWrapper>
      {/* Modal de Preview Ampliado */}
      {showFullImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md cursor-zoom-out" onClick={() => setShowFullImage(false)}>
          <img src={tokenPreviewUrl} alt="Full Preview" className="max-w-[80%] max-h-[80%] object-contain drop-shadow-[0_0_50px_rgba(168,85,247,0.4)]" onError={(e) => (e.currentTarget.src = '/tokens/aliado.png')} />
        </div>
      )}

      {/* Container Principal de Criação */}
      <div className="bg-black/70 backdrop-blur-2xl w-[900px] h-[650px] rounded-2xl border border-purple-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden group">
        {/* Efeito de brilho no topo */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-widest" style={{ fontFamily: 'Cinzel' }}>FORJAR HERÓI</h2>
          <div className="flex gap-3">
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step === 2 ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-white/10'}`}></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step === 3 ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-white/10'}`}></div>
          </div>
        </div>

        {step === 2 && (
          <div className="p-8 flex flex-col gap-6 flex-grow overflow-hidden">
            <div className="flex gap-8 items-start">
              <div className="flex-grow">
                <label className="text-[10px] text-amber-500/60 uppercase font-bold tracking-[0.2em] mb-2 block">Nome da Lenda</label>
                <input autoFocus type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-lg text-2xl text-amber-50 outline-none focus:border-amber-500/50 transition-all font-serif" placeholder="Ex: Aethelred" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="flex flex-col items-center group/preview cursor-pointer" onClick={() => setShowFullImage(true)}>
                <div className="w-24 h-24 rounded-2xl border-2 border-amber-500/30 overflow-hidden bg-black shadow-2xl relative">
                  <img src={tokenPreviewUrl} alt="Token" className="w-full h-full object-cover group-hover/preview:scale-110 transition-transform duration-500" onError={(e) => (e.currentTarget.src = '/tokens/aliado.png')} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-end justify-center pb-2">
                    <span className="text-[8px] text-amber-400 font-bold uppercase tracking-widest">Ampliar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 flex-grow">
              <div className="flex flex-col h-full">
                <label className="text-[10px] text-amber-500/60 uppercase font-bold tracking-[0.2em] mb-3 block">Linhagem (Raça)</label>
                <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                  {Object.keys(RACES).map(r => (
                    <button key={r} onClick={() => setSelectedRace(r as any)} className={`p-4 rounded-xl text-left border transition-all duration-300 ${selectedRace === r ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-inner' : 'bg-white/5 border-white/5 text-amber-100/40 hover:bg-white/10'}`}>
                      <div className="font-bold text-sm tracking-widest">{r}</div>
                      <div className="text-[9px] uppercase opacity-50">{(RACES as any)[r].desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col h-full">
                <label className="text-[10px] text-amber-500/60 uppercase font-bold tracking-[0.2em] mb-3 block">Ofício (Classe)</label>
                <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                  {Object.keys(CLASSES).map(c => (
                    <button key={c} onClick={() => setSelectedClass(c as any)} className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 ${selectedClass === c ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-inner' : 'bg-white/5 border-white/5 text-purple-100/40 hover:bg-white/10'}`}>
                      <div className="text-3xl mb-2 drop-shadow-lg">{(CLASSES as any)[c].icon}</div>
                      <div className="font-bold text-[10px] tracking-tighter uppercase">{c}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center border-t border-white/5 pt-6">
               {error && <p className="text-red-400 text-xs animate-bounce">{error}</p>}
               <div className="flex-grow"></div>
               <button onClick={() => { if(name) {setStep(3); setError('');} else setError('Dê um nome ao seu herói!'); }} className="px-10 py-4 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 tracking-widest uppercase text-sm border border-amber-400/30">Próximo ❯</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8 flex flex-col h-full items-center">
            <div className="text-center mb-10">
              <span className="text-[10px] text-amber-500/60 uppercase font-bold tracking-[0.3em]">Pontos de Destino</span>
              <div className={`text-7xl font-black mt-2 transition-colors ${pointsLeft < 0 ? 'text-red-500' : 'text-amber-400'}`} style={{ fontFamily: 'Cinzel' }}>{pointsLeft}</div>
            </div>

            <div className="grid grid-cols-3 gap-6 w-full mb-10">
              {Object.keys(stats).map((key) => {
                const attr = key as keyof typeof stats;
                const racial = (RACES as any)[selectedRace].bonus[attr];
                const total = stats[attr] + racial;
                const mod = Math.floor((total - 10) / 2);
                return (
                  <div key={attr} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center relative hover:bg-white/10 transition-all border-b-2 border-b-amber-500/20">
                    <span className="text-[10px] text-amber-500/80 font-black uppercase tracking-widest mb-3">{attr}</span>
                    <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                      <button onClick={() => handleStatChange(attr, false)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/40 rounded-lg text-xl text-white transition-all disabled:opacity-10" disabled={stats[attr] <= 8}>-</button>
                      <span className="text-3xl font-black font-serif w-10 text-center text-white">{stats[attr]}</span>
                      <button onClick={() => handleStatChange(attr, true)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-green-500/40 rounded-lg text-xl text-white transition-all disabled:opacity-10" disabled={stats[attr] >= 15 || pointsLeft <= 0}>+</button>
                    </div>
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-700 rounded-xl flex flex-col items-center justify-center text-black font-black shadow-lg">
                      <span className="text-[8px] uppercase leading-none mb-0.5">Mod</span>
                      <span className="text-lg leading-none">{mod >= 0 ? `+${mod}` : mod}</span>
                    </div>
                    <div className="mt-3 text-[9px] text-amber-100/40 font-bold uppercase">Total com Bônus: <span className="text-amber-400">{total}</span></div>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto w-full flex justify-between items-center border-t border-white/5 pt-8">
              <button onClick={() => setStep(2)} className="text-purple-300/50 hover:text-purple-300 font-bold uppercase tracking-widest text-xs transition-colors">❮ Alterar Raça/Classe</button>
              <button onClick={handleFinalSubmit} className="px-14 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-800 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all tracking-[0.2em] uppercase border border-amber-400/40">Entrar no Mundo</button>
            </div>
          </div>
        )}
      </div>
    </BackgroundWrapper>
  );
};

export default LoginScreen;