// ========== CÓDIGO DO MENU ==========
document.addEventListener("DOMContentLoaded", function() {
    const menuIcon = document.getElementById("menuIcon");
    const menu = document.getElementById("menu");

    // Abrir/Fechar menu
    menuIcon.addEventListener("click", function(e) {
        e.stopPropagation();
        menu.classList.toggle("active");
        menuIcon.classList.toggle("active");
    });

    // Fechar menu ao clicar fora
    document.addEventListener("click", function(e) {
        if (!menu.contains(e.target) && !menuIcon.contains(e.target)) {
            menu.classList.remove("active");
            menuIcon.classList.remove("active");
        }
    });

    // Animar itens do menu
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("mouseenter", function() {
            this.style.transform = "translateY(-3px)";
        });
        
        item.addEventListener("mouseleave", function() {
            this.style.transform = "translateY(0)";
        });
    });
});

// ========== LÓGICA DO JOGO ==========
const gameState = {
    sanity: 100,
    inventory: new Map(),
    currentScenario: 'entrance',
    karma: 0,
    endingsDiscovered: new Set(),
    timeSpent: 0
};

const scenarios = {
    entrance: {
        text: "A porta rangendo ecoa no silêncio. Um cheiro de mofo invade suas narinas...",
        image: "entrance.jpg",
        choices: [
            { 
                text: "Forçar a porta", 
                next: "hall",
                effect: () => gameState.sanity -= 10
            },
            { 
                text: "Procurar entrada alternativa", 
                next: "secret_garden",
                requiredItem: "lanterna",
                effect: () => gameState.karma += 5
            }
        ],
        item: { id: "chave_ferrugenta", type: "key" }
    },
    
    hall: {
        text: "O hall principal está em ruínas. Um retrato quebrado observa você...",
        image: "hall.jpg",
        choices: [
            {
                text: "Subir escada carcomida",
                next: "upper_floor",
                effect: () => gameState.sanity -= 20
            },
            {
                text: "Examinar a lareira",
                puzzle: "combination",
                requiredItem: "fósforos"
            }
        ],
        puzzle: {
            type: "combination",
            question: "Sequência no relógio quebrado (IX, III, VII):",
            solution: "9-3-7",
            reward: "medalhão_prateado"
        }
    },

    fountain: {
        text: "A água estagnada reflete um rosto que não é o seu...",
        image: "fountain.jpg",
        choices: [
            {
                text: "Tocar na água",
                next: "ghost_encounter",
                effect: () => gameState.sanity -= 15
            },
            {
                text: "Examinar as bordas da fonte",
                next: "hidden_compartment",
                effect: () => gameState.inventory.set("chave_pequena", { type: "key" })
            }
        ]
    },

    upper_floor: {
        text: "O andar superior range sob seus passos. Algo se move nas sombras...",
        image: "upper_floor.jpg",
        choices: [
            {
                text: "Abrir a porta à esquerda",
                next: "library",
                effect: () => gameState.sanity -= 10
            },
            {
                text: "Seguir o corredor",
                next: "bedroom",
                effect: () => gameState.karma -= 5
            }
        ]
    },

    library: {
        text: "Livros empoeirados enchem as prateleiras. Um diário se destaca...",
        image: "library.jpg",
        choices: [
            {
                text: "Ler o diário",
                next: "ritual_reveal",
                effect: () => gameState.inventory.set("diário_ocultista", { type: "puzzle" })
            },
            {
                text: "Procurar passagem secreta",
                puzzle: "ancient_code"
            }
        ]
    },

    bedroom: {
        text: "A cama está intocada, como se alguém ainda dormisse nela...",
        image: "bedroom.jpg",
        choices: [
            {
                text: "Abrir o guarda-roupa",
                next: "shadow_attack",
                effect: () => gameState.sanity -= 20
            },
            {
                text: "Olhar debaixo da cama",
                next: "hidden_trapdoor",
                effect: () => gameState.inventory.set("chave_dourada", { type: "key" })
            }
        ]
    },

    shadow_attack: {
        text: "Uma sombra salta contra você! Seus gritos ecoam pela casa...",
        image: "shadow_attack.jpg",
        effect: () => gameState.sanity -= 30,
        choices: [
            {
                text: "Lutar contra a sombra",
                next: "escaped",
                requiredItem: "medalhão_prateado"
            },
            {
                text: "Fugir",
                next: "hall",
                effect: () => gameState.karma -= 10
            }
        ]
    },

    hidden_trapdoor: {
        text: "Uma passagem secreta leva a um porão escuro...",
        image: "trapdoor.jpg",
        choices: [
            {
                text: "Descer com cautela",
                next: "ritual_chamber"
            }
        ]
    },

    ritual_chamber: {
        text: "Velas apagadas cercam um círculo de sangue seco...",
        image: "ritual_chamber.jpg",
        choices: [
            {
                text: "Completar o ritual",
                next: "true_ending",
                requiredItem: "diário_ocultista"
            },
            {
                text: "Destruir o círculo",
                next: "cursed_fate",
                effect: () => gameState.sanity -= 50
            }
        ]
    },

    cursed_fate: {
        text: "As sombras se fecham ao seu redor... Você nunca mais sairá desta casa.",
        image: "cursed_fate.jpg",
        ending: true
    },

    true_ending: {
        text: "O ritual é completado. Os sussurros cessam. Você libertou as almas presas aqui...",
        image: "true_ending.jpg",
        effect: () => gameState.karma += 50,
        ending: true
    }
};

// ========== SISTEMA DE INVENTÁRIO ==========
const inventoryManager = {
    updateDisplay() {
        const inventoryUI = document.getElementById('inventoryUI');
        inventoryUI.innerHTML = Array.from(gameState.inventory.entries()).map(([id, item]) => `
            <div class="inventory-item" 
                 data-item="${id}"
                 style="background-image: url('items/${id}.png')">
                 ${item.uses ? `<span class="item-uses">${item.uses}</span>` : ''}
            </div>
        `).join('');
    }
};

// ========== SISTEMA DE PUZZLES ==========
class PuzzleSystem {
    constructor() {
        this.activePuzzle = null;
    }

    startPuzzle(puzzleData) {
        this.activePuzzle = puzzleData;
        const puzzleHTML = `
            <div class="puzzle-box">
                <p>${puzzleData.question}</p>
                <input type="text" id="puzzle-input">
                <button onclick="submitPuzzle()">Submeter</button>
            </div>
        `;
        document.getElementById('puzzle-container').innerHTML = puzzleHTML;
    }

    checkSolution(answer) {
        if (!this.activePuzzle) return false; // Evita erro se o puzzle não estiver ativo
    
        // Remove espaços extras e normaliza a resposta
        const normalizedAnswer = answer.replace(/\s+/g, "").replace(/-/g, "");
        const normalizedSolution = this.activePuzzle.solution.replace(/\s+/g, "").replace(/-/g, "");
    
        return normalizedAnswer === normalizedSolution;
    }
}

const puzzleSystem = new PuzzleSystem();

function submitPuzzle() {
    const answer = document.getElementById('puzzle-input').value;
    if (puzzleSystem.checkSolution(answer)) {
        gameState.inventory.set(scenarios[gameState.currentScenario].puzzle.reward, { type: "item" });
        puzzleSystem.activePuzzle = null; // 🔥 Reseta o puzzle após a resposta correta
        document.getElementById('puzzle-container').innerHTML = ""; // 🔥 Remove a caixa do enigma
        loadScenario(gameState.currentScenario); // Recarrega o cenário para continuar a história
    }
}

// ========== EVENTOS DINÂMICOS ==========
const dynamicEvents = {
    hallucination: {
        trigger: () => gameState.sanity < 30,
        effect: () => {
            applyVisualFilter('hue-rotate(180deg) blur(2px)');
            addRandomChoice("[ALUCINAÇÃO] Seguir os sussurros", "void_dimension");
        }
    },
    temporal_shift: {
        trigger: () => gameState.inventory.has('ancient_artifact'),
        effect: () => rewindScenario(3)
    }
};

function checkDynamicEvents() {
    Object.values(dynamicEvents).forEach(event => {
        if (event.trigger()) event.effect();
    });
}

// ========== FUNÇÕES AUXILIARES ==========
function applyVisualFilter(filter) {
    document.body.style.filter = filter;
    setTimeout(() => document.body.style.filter = '', 5000);
}

function playSound(soundName) {
    try {
        new Audio(`sounds/${soundName}.mp3`).play();
    } catch (e) {
        console.error("Erro de áudio:", e);
    }
}

function updateSanityDisplay() {
    const sanityBar = document.getElementById('sanityBar');
    sanityBar.style.width = `${gameState.sanity}%`;
    document.body.classList.toggle('low-sanity', gameState.sanity < 30);
}

// ========== NAVEGAÇÃO ENTRE CENÁRIOS ==========
function loadScenario(scenarioId) {
    const scenario = scenarios[scenarioId];
    gameState.currentScenario = scenarioId;
    document.getElementById('game-text').textContent = scenario.text;
    
    // Atualizar escolhas
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = scenario.choices.map(choice => {
        if (choice.requiredItem && !gameState.inventory.has(choice.requiredItem)) return '';
        return `<button class="button-style" onclick="handleChoice('${choice.next}')">${choice.text}</button>`;
    }).join('');

    // Adicionar item ao inventário
    if (scenario.item) gameState.inventory.set(scenario.item.id, scenario.item);

    // Atualizar UI
    inventoryManager.updateDisplay();
    updateSanityDisplay();
}

function handleChoice(nextScenario) {
    const choice = scenarios[gameState.currentScenario].choices.find(c => c.next === nextScenario);
    if (choice?.effect) choice.effect();
    
    if (scenarios[nextScenario]?.puzzle) {
        puzzleSystem.startPuzzle(scenarios[nextScenario].puzzle);
    } else {
        loadScenario(nextScenario);
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    loadScenario(gameState.currentScenario);
    setInterval(() => {
        gameState.sanity = Math.max(0, gameState.sanity - 0.5);
        gameState.timeSpent += 1;
        updateSanityDisplay();
        checkDynamicEvents();
    }, 60000);
});

// ========== EXTRA (RECEITAS DE ITENS) ==========
const recipes = {
    "chave_ferrugenta+chave_pequena": { id: "chave_mestra", type: "key" }
};

function combineItems(item1, item2) {
    const combinedItem = recipes[`${item1}+${item2}`] || recipes[`${item2}+${item1}`];
    if (combinedItem) {
        gameState.inventory.delete(item1);
        gameState.inventory.delete(item2);
        gameState.inventory.set(combinedItem.id, combinedItem);
        inventoryManager.updateDisplay();
    }
}