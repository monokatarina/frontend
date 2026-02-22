// ============================================
// plans.js - Página de Planos da FitLife
// Versão com Treino Normal e Dança
// ============================================

const API = 'https://jokesteronline.org/api';

// ============================================
// CONFIGURAÇÃO DOS PLANOS (NOVOS)
// ============================================
const PLANS = {
    // ===== TREINO NORMAL =====
    normal_2x: {
        id: 'normal_2x',
        name: 'Treino Normal 2x',
        categoria: 'normal',
        aulasPorSemana: 2,
        price: 400.00,
        color: '#10b981',
        icon: 'fa-dumbbell',
        description: 'Treino normal 2 vezes por semana',
        horarios: 'Todos os horários (6h-12h e 16h-19h)',
        features: [
            '2 aulas por semana',
            'Acesso a todos horários',
            'Suporte básico',
            'Acesso ao app mobile'
        ],
        popular: false
    },
    normal_3x: {
        id: 'normal_3x',
        name: 'Treino Normal 3x',
        categoria: 'normal',
        aulasPorSemana: 3,
        price: 510.00,
        color: '#3b82f6',
        icon: 'fa-dumbbell',
        description: 'Treino normal 3 vezes por semana',
        horarios: 'Todos os horários (6h-12h e 16h-19h)',
        features: [
            '3 aulas por semana',
            'Acesso a todos horários',
            'Suporte prioritário',
            'Acesso ao app mobile',
            'Avaliação mensal'
        ],
        popular: true // Mais popular dos treinos normais
    },
    normal_5x: {
        id: 'normal_5x',
        name: 'Treino Normal 5x',
        categoria: 'normal',
        aulasPorSemana: 5,
        price: 800.00,
        color: '#8b5cf6',
        icon: 'fa-crown',
        description: 'Treino normal 5 vezes por semana',
        horarios: 'Todos os horários (6h-12h e 16h-19h)',
        features: [
            '5 aulas por semana',
            'Acesso a todos horários',
            'Suporte VIP',
            'Acesso ao app mobile',
            'Avaliação semanal',
            'Acompanhamento personalizado'
        ],
        popular: false
    },
    
    // ===== DANÇA =====
    danca_2x: {
        id: 'danca_2x',
        name: 'Dança 2x',
        categoria: 'danca',
        aulasPorSemana: 2,
        price: 79.00,
        color: '#ec4899',
        icon: 'fa-music',
        description: 'Aulas de dança 2 vezes por semana',
        horarios: '14:00 e 15:00',
        features: [
            '2 aulas de dança por semana',
            'Horários: 14:00 e 15:00',
            'Professores especializados',
            'Turmas reduzidas'
        ],
        popular: true // Mais popular da dança
    },
    danca_3x: {
        id: 'danca_3x',
        name: 'Dança 3x',
        categoria: 'danca',
        aulasPorSemana: 3,
        price: 89.00,
        color: '#ec4899',
        icon: 'fa-music',
        description: 'Aulas de dança 3 vezes por semana',
        horarios: '14:00 e 15:00',
        features: [
            '3 aulas de dança por semana',
            'Horários: 14:00 e 15:00',
            'Professores especializados',
            'Turmas reduzidas',
            'Coreografias exclusivas'
        ],
        popular: false
    }
};

// Mapeamento das categorias
const PLANOS_POR_CATEGORIA = {
    normal: ['normal_2x', 'normal_3x', 'normal_5x'],
    danca: ['danca_2x', 'danca_3x']
};

// ============================================
// ESTADO GLOBAL
// ============================================
let selectedPlan = null;
let currentUser = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Página de Planos iniciada');
    
    // Verificar usuário logado
    checkUserLogin();
    
    // Renderizar planos
    renderPlans();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Adicionar estilos dinâmicos
    addDynamicStyles();
});

// ============================================
// VERIFICAÇÃO DE USUÁRIO
// ============================================
function checkUserLogin() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('👤 Usuário logado:', currentUser.name);
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            localStorage.removeItem('user');
        }
    }
}

// ============================================
// RENDERIZAÇÃO DOS PLANOS
// ============================================
function renderPlans() {
    const grid = document.getElementById('plansGrid');
    if (!grid) {
        console.error('❌ Elemento plansGrid não encontrado');
        return;
    }
    
    grid.innerHTML = '';
    
    // Cabeçalho Treino Normal
    const normalHeader = document.createElement('div');
    normalHeader.className = 'categoria-header';
    normalHeader.innerHTML = `
        <h2><i class="fas fa-dumbbell" style="color: #10b981;"></i> Treinos Normais</h2>
        <p>Musculação e condicionamento físico • Horários: 6h-12h e 16h-19h</p>
    `;
    grid.appendChild(normalHeader);
    
    // Planos Normais
    PLANOS_POR_CATEGORIA.normal.forEach(id => {
        const card = createPlanCard(id, PLANS[id]);
        grid.appendChild(card);
    });
    
    // Cabeçalho Dança
    const dancaHeader = document.createElement('div');
    dancaHeader.className = 'categoria-header';
    dancaHeader.innerHTML = `
        <h2><i class="fas fa-music" style="color: #ec4899;"></i> Aulas de Dança</h2>
        <p>Dança • Horários disponíveis: 14:00 e 15:00 (segunda a sexta)</p>
    `;
    grid.appendChild(dancaHeader);
    
    // Planos de Dança
    PLANOS_POR_CATEGORIA.danca.forEach(id => {
        const card = createPlanCard(id, PLANS[id]);
        grid.appendChild(card);
    });
    
    // Adicionar animação após renderizar
    setTimeout(() => {
        document.querySelectorAll('.plan-card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, 100);
}

// ============================================
// CRIAÇÃO DO CARD DO PLANO
// ============================================
function createPlanCard(id, plan) {
    const card = document.createElement('div');
    card.className = `plan-card ${id}`;
    card.dataset.plan = id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Selecionar plano ${plan.name}`);
    
    // Estilo inicial para animação
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.3s ease';
    
    // Badge de popular
    const popularBadge = plan.popular ? 
        '<span class="popular-badge"><i class="fas fa-star"></i> Mais popular</span>' : '';
    
    const categoriaNome = plan.categoria === 'normal' ? 'Treino' : 'Dança';
    
    card.innerHTML = `
        ${popularBadge}
        <span class="categoria-tag" style="background: ${plan.color}20; color: ${plan.color}">${categoriaNome}</span>
        <div class="plan-icon" style="color: ${plan.color}; font-size: 32px; margin-top: 20px;">
            <i class="fas ${plan.icon}"></i>
        </div>
        <h3>${plan.name}</h3>
        <div class="plan-description">${plan.description}</div>
        <div class="price" style="color: ${plan.color}">
            R$ ${plan.price.toFixed(2)}
            <span>/mês</span>
        </div>
        <div class="horarios-info">
            <i class="fas fa-clock" style="color: ${plan.color}"></i>
            <span>${plan.horarios}</span>
        </div>
        <div class="features">
            ${plan.features.map(f => `
                <div class="feature">
                    <i class="fas fa-check-circle" style="color: ${plan.color}"></i>
                    <span>${f}</span>
                </div>
            `).join('')}
        </div>
        <button class="btn-select" style="background: ${plan.color}; color: white;">
            <i class="fas fa-crown"></i>
            Escolher plano
        </button>
    `;

    // Event listeners
    card.addEventListener('click', () => selectPlan(id, card));
    card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectPlan(id, card);
        }
    });

    return card;
}

// ============================================
// SELEÇÃO DO PLANO
// ============================================
function selectPlan(planId, card) {
    // Remover seleção anterior
    document.querySelectorAll('.plan-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-selected', 'false');
    });
    
    // Marcar novo plano
    card.classList.add('selected');
    card.setAttribute('aria-selected', 'true');
    selectedPlan = planId;
    
    // Feedback visual
    showNotification(`Plano ${PLANS[planId].name} selecionado!`, 'success');
    
    // Verificar se usuário está logado
    if (!currentUser) {
        showNotification('Faça login para continuar', 'warning');
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        return;
    }
    
    // Salvar plano selecionado e redirecionar
    saveSelectedPlanAndRedirect(planId);
}

// ============================================
// SALVAR PLANO E REDIRECIONAR
// ============================================
function saveSelectedPlanAndRedirect(planId) {
    const selectedPlanData = {
        id: planId,
        name: PLANS[planId].name,
        categoria: PLANS[planId].categoria,
        aulasPorSemana: PLANS[planId].aulasPorSemana,
        price: PLANS[planId].price,
        horarios: PLANS[planId].horarios,
        features: PLANS[planId].features
    };
    
    // Salvar na sessionStorage (temporário)
    sessionStorage.setItem('selectedPlan', JSON.stringify(selectedPlanData));
    
    // Feedback visual
    showNotification('Redirecionando para checkout...', 'info');
    
    // Redirecionar para checkout
    setTimeout(() => {
        window.location.href = '/checkout';
    }, 1000);
}

// ============================================
// CONFIGURAÇÃO DOS EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Botão de voltar (se existir)
    const backBtn = document.getElementById('backToHome');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
    
    // Remover formulário antigo se existir
    const oldPaymentForm = document.getElementById('paymentForm');
    if (oldPaymentForm) {
        oldPaymentForm.remove();
    }
}

// ============================================
// SISTEMA DE NOTIFICAÇÕES
// ============================================
function showNotification(message, type = 'info') {
    // Verificar se já existe container
    let container = document.getElementById('notificationContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    // Criar notificação
    const notification = document.createElement('div');
    notification.style.cssText = `
        min-width: 300px;
        padding: 16px 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${getNotificationColor(type)};
    `;
    
    // Ícone baseado no tipo
    const icon = getNotificationIcon(type);
    const color = getNotificationColor(type);
    
    notification.innerHTML = `
        <i class="fas ${icon}" style="color: ${color}; font-size: 20px;"></i>
        <span style="flex: 1; color: #1f2937;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; color: #9ca3af;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// ============================================
// ESTILOS DINÂMICOS (adicionais)
// ============================================
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .plan-card {
            position: relative;
            background: white;
            border-radius: 20px;
            padding: 32px 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.3s;
            cursor: pointer;
            border: 2px solid transparent;
            overflow: hidden;
        }
        
        .plan-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .plan-card.selected {
            border-color: #10b981;
            transform: scale(1.02);
            box-shadow: 0 25px 50px rgba(16,185,129,0.2);
        }
        
        .popular-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #f59e0b;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            z-index: 10;
        }
        
        .categoria-tag {
            position: absolute;
            top: 20px;
            left: 20px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            z-index: 10;
        }
        
        .plan-description {
            color: #6b7280;
            font-size: 14px;
            margin: 10px 0;
            line-height: 1.5;
        }
        
        .price {
            font-size: 42px;
            font-weight: 700;
            margin: 20px 0;
        }
        
        .price span {
            font-size: 16px;
            font-weight: normal;
            color: #6b7280;
        }
        
        .horarios-info {
            background: #f3f4f6;
            padding: 10px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 13px;
            color: #4b5563;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .features {
            margin: 25px 0;
        }
        
        .feature {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            color: #374151;
        }
        
        .feature i {
            font-size: 14px;
        }
        
        .btn-select {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-select:hover {
            filter: brightness(0.9);
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
            .plan-card {
                padding: 24px 20px;
            }
            
            .plan-card h3 {
                font-size: 24px;
            }
            
            .price {
                font-size: 36px;
            }
            
            .feature {
                font-size: 14px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.PLANS = PLANS;
window.selectPlan = selectPlan;

console.log('✅ plans.js carregado com sucesso!');