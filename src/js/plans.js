// ============================================
// plans.js - Página de Planos da FitLife
// Versão Profissional com Checkot Integrado
// ============================================

const API = 'https://jokesteronline.org/api';

// ============================================
// CONFIGURAÇÃO DOS PLANOS
// ============================================
const PLANS = {
    basic: {
        id: 'basic',
        name: 'Básico',
        aulasPorSemana: 2,
        price: 1.00,
        color: '#10b981',
        icon: 'fa-seedling',
        description: 'Ideal para quem está começando',
        features: [
            '2 aulas por semana',
            'Acesso a todos horários',
            'Suporte por email',
            'Cancelamento a qualquer momento',
            'Acesso ao app mobile'
        ],
        popular: false
    },
    intermediate: {
        id: 'intermediate',
        name: 'Intermediário',
        aulasPorSemana: 3,
        price: 1.00,
        color: '#3b82f6',
        icon: 'fa-fire',
        description: 'Para quem busca evolução constante',
        features: [
            '3 aulas por semana',
            'Acesso a todos horários',
            'Suporte prioritário',
            'Cancelamento a qualquer momento',
            'Acesso ao app mobile',
            'Avaliação mensal'
        ],
        popular: true
    },
    advanced: {
        id: 'advanced',
        name: 'Avançado',
        aulasPorSemana: 4,
        price: 1.00,
        color: '#f59e0b',
        icon: 'fa-rocket',
        description: 'Máximo desempenho e resultados',
        features: [
            '4 aulas por semana',
            'Acesso a todos horários',
            'Suporte VIP',
            'Cancelamento a qualquer momento',
            'Acesso ao app mobile',
            'Avaliação mensal',
            'Acompanhamento personalizado'
        ],
        popular: false
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        aulasPorSemana: 5,
        price: 1.00,
        color: '#8b5cf6',
        icon: 'fa-crown',
        description: 'Experiência completa e exclusiva',
        features: [
            '5 aulas por semana',
            'Acesso a todos horários',
            'Suporte 24/7',
            'Cancelamento a qualquer momento',
            'Acesso ao app mobile',
            'Avaliação semanal',
            'Acompanhamento personalizado',
            'Acesso a eventos exclusivos'
        ],
        popular: false
    }
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

    Object.entries(PLANS).forEach(([id, plan]) => {
        const card = createPlanCard(id, plan);
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
    
    card.innerHTML = `
        ${popularBadge}
        <div class="plan-icon" style="background: ${plan.color}20; color: ${plan.color}">
            <i class="fas ${plan.icon}"></i>
        </div>
        <div class="badge" style="background: ${plan.color}">${plan.name}</div>
        <h3>${plan.name}</h3>
        <div class="plan-description">${plan.description}</div>
        <div class="price">
            R$ ${plan.price.toFixed(2)}
            <span>/mês</span>
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
        aulasPorSemana: PLANS[planId].aulasPorSemana,
        price: PLANS[planId].price,
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
// ESTILOS DINÂMICOS
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
        
        .plan-card.selected::before {
            content: '✓';
            position: absolute;
            top: 20px;
            left: 20px;
            width: 30px;
            height: 30px;
            background: #10b981;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
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
        
        .popular-badge i {
            font-size: 10px;
        }
        
        .plan-icon {
            width: 60px;
            height: 60px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        .plan-description {
            color: #6b7280;
            font-size: 14px;
            margin: 10px 0;
            line-height: 1.5;
        }
        
        .badge {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 6px 12px;
            border-radius: 20px;
            color: white;
            font-size: 12px;
            font-weight: 600;
        }
        
        .plan-card h3 {
            font-size: 28px;
            margin-bottom: 8px;
            color: #1f2937;
        }
        
        .price {
            font-size: 42px;
            font-weight: 700;
            color: #6366f1;
            margin: 20px 0;
        }
        
        .price span {
            font-size: 16px;
            font-weight: normal;
            color: #6b7280;
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
        
        .btn-select i {
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .plan-card {
                padding: 24px 20px;
            }
            
            .plan-icon {
                width: 50px;
                height: 50px;
                font-size: 20px;
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
// FUNÇÕES DE UTILIDADE (opcionais)
// ============================================

// Formatar preço
function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price);
}

// Calcular economia anual
function calculateYearlySavings(monthlyPrice) {
    const yearlyPrice = monthlyPrice * 12;
    const discountedPrice = yearlyPrice * 0.9; // 10% de desconto
    const savings = yearlyPrice - discountedPrice;
    return formatPrice(savings);
}

// Compartilhar plano
function sharePlan(planId) {
    const plan = PLANS[planId];
    const text = `Conheça o plano ${plan.name} da FitLife! Apenas R$ ${plan.price}/mês.`;
    
    if (navigator.share) {
        navigator.share({
            title: `Plano ${plan.name} - FitLife`,
            text: text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text + ' ' + window.location.href);
        showNotification('Link copiado!', 'success');
    }
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS (se necessário)
// ============================================
window.sharePlan = sharePlan;
window.selectPlan = selectPlan;

console.log('✅ plans.js carregado com sucesso!');