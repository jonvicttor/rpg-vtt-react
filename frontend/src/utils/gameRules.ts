// TABELA DE XP (D&D 5ª Edição)
// Índice 0 = Nível 1, Índice 1 = Nível 2, etc.
export const XP_TABLE = [
    0,      // Nível 1
    300,    // Nível 2
    900,    // Nível 3
    2700,   // Nível 4
    6500,   // Nível 5
    14000,  // Nível 6
    23000,  // Nível 7
    34000,  // Nível 8
    48000,  // Nível 9
    64000,  // Nível 10
    85000,  // Nível 11
    100000, // Nível 12
    120000, // Nível 13
    140000, // Nível 14
    165000, // Nível 15
    195000, // Nível 16
    225000, // Nível 17
    265000, // Nível 18
    305000, // Nível 19
    355000  // Nível 20
];

/**
 * Calcula o Nível do personagem baseado no XP Total.
 * Ex: 1000 XP -> Retorna Nível 3
 */
export const getLevelFromXP = (xp: number): number => {
    let level = 1;
    for (let i = 0; i < XP_TABLE.length; i++) {
        if (xp >= XP_TABLE[i]) {
            level = i + 1;
        } else {
            break;
        }
    }
    return level;
};

/**
 * Retorna o Bônus de Proficiência baseado no Nível (Tabela Oficial).
 * Nível 1-4: +2
 * Nível 5-8: +3
 * ...
 */
export const getProficiencyBonus = (level: number): number => {
    return Math.ceil(1 + (level / 4));
};

/**
 * Calcula o Modificador de Atributo.
 * Fórmula: (Valor - 10) / 2 arredondado para baixo.
 * Ex: Força 16 -> (16-10)/2 = +3
 */
export const getAttributeModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
};

/**
 * Calcula quanto XP falta para o próximo nível.
 * Útil para a barra de progresso.
 */
export const getNextLevelXP = (currentLevel: number): number => {
    if (currentLevel >= 20) return XP_TABLE[19]; // Cap no nível 20
    return XP_TABLE[currentLevel]; // O índice currentLevel pega o próximo marco (pois array começa em 0)
};

// --- NOVAS REGRAS: CLASSES E VIDA ---

/**
 * Mapeamento de Classes para Dado de Vida (Hit Die).
 * Inclui variações com e sem acento para facilitar.
 */
export const CLASS_HIT_DICE: Record<string, number> = {
    'bárbaro': 12, 'barbaro': 12,
    'bardo': 8,
    'clérigo': 8, 'clerigo': 8,
    'druida': 8,
    'guerreiro': 10,
    'monge': 8,
    'paladino': 10,
    'patrulheiro': 10, 'ranger': 10,
    'ladino': 8,
    'feiticeiro': 6,
    'bruxo': 8,
    'mago': 6,
    'artífice': 8, 'artifice': 8,
    'npc': 8 // Padrão se não encontrar
};

/**
 * Calcula quanto de HP o personagem ganha ao subir de nível (Média Fixa).
 * Regra: Média do Dado + Mod. Constituição.
 * Ex: Guerreiro (d10 -> média 6) com Con 16 (+3) ganha 9 HP.
 */
export const calculateHPGain = (className: string, conScore: number): number => {
    // Normaliza o nome (minúsculo, sem espaços extras)
    const key = (className || 'npc').toLowerCase().trim();
    const hitDie = CLASS_HIT_DICE[key] || 8; // Padrão d8 se não achar
    
    // Média arredondada para cima (Regra 5e): (dado / 2) + 1
    const avg = (hitDie / 2) + 1;
    
    const conMod = getAttributeModifier(conScore);

    // Garante que ganha pelo menos 1 de vida
    return Math.max(1, avg + conMod);
};