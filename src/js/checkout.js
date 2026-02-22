// ============================================
// checkout.js - Página de Checkout da FitLife
// VERSÃO ATUALIZADA - SUPORTE A MÚLTIPLOS PLANOS
// ============================================

const API = 'https://jokesteronline.org/api';

// ============================================
// CONFIGURAÇÃO DOS PLANOS (mesma do plans.js)
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
    }
};

// ============================================
// ESTADO GLOBAL
// ============================================
let currentUser = null;
let selectedPlans = [];
let paymentData = {};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Checkout Multiplanos iniciado');
    
    // Verificar usuário logado
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
        console.log('❌ Usuário não logado, redirecionando...');
        window.location.href = '/';
        return;
    }
    
    try {
        currentUser = JSON.parse(savedUser);
        console.log('👤 Usuário:', currentUser.name);
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        window.location.href = '/';
        return;
    }
    
    // Carregar planos selecionados
    loadSelectedPlans();
    
    // Renderizar resumo do pedido
    renderOrderSummary();
    
    // Configurar tabs de pagamento
    setupPaymentTabs();
    
    // Adicionar estilos adicionais
    addCheckoutStyles();
});

// ============================================
// CARREGAR PLANOS SELECIONADOS
// ============================================
function loadSelectedPlans() {
    const plansStr = sessionStorage.getItem('selectedPlans');
    
    if (!plansStr) {
        console.log('❌ Nenhum plano selecionado');
        showError('Nenhum plano foi selecionado', true);
        return;
    }
    
    try {
        selectedPlans = JSON.parse(plansStr);
        console.log('📋 Planos selecionados:', selectedPlans);
        
        if (selectedPlans.length === 0) {
            showError('Selecione pelo menos um plano', true);
        }
    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        showError('Erro ao carregar planos selecionados', true);
    }
}

// ============================================
// RENDERIZAR RESUMO DO PEDIDO
// ============================================
function renderOrderSummary() {
    const planSummary = document.getElementById('planSummary');
    const planFeatures = document.getElementById('planFeatures');
    const totalPrice = document.getElementById('totalPrice');
    
    if (!planSummary || !planFeatures || !totalPrice) {
        console.error('Elementos do resumo não encontrados');
        return;
    }
    
    let total = 0;
    let allFeatures = [];
    let uniqueCategories = new Set();
    
    planSummary.innerHTML = '';
    
    selectedPlans.forEach(planId => {
        const plan = PLANS[planId];
        if (!plan) return;
        
        total += plan.price;
        uniqueCategories.add(plan.categoria);
        allFeatures = [...allFeatures, ...plan.features];
        
        // Criar elemento do plano
        const planElement = document.createElement('div');
        planElement.className = 'plan-detail';
        planElement.style.borderLeft = `4px solid ${plan.color}`;
        planElement.style.paddingLeft = '15px';
        planElement.style.marginBottom = '10px';
        planElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${plan.icon}" style="color: ${plan.color}; font-size: 20px;"></i>
                <span class="plan-name">${plan.name}</span>
            </div>
            <span class="plan-price" style="color: ${plan.color}">R$ ${plan.price.toFixed(2)}</span>
        `;
        
        planSummary.appendChild(planElement);
    });
    
    // Features únicas (sem duplicatas)
    const uniqueFeatures = [...new Set(allFeatures)];
    
    // Mostrar resumo das categorias
    if (uniqueCategories.size > 1) {
        const categoriesElement = document.createElement('div');
        categoriesElement.className = 'categories-summary';
        categoriesElement.style.cssText = `
            background: #f0f9ff;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            font-size: 13px;
        `;
        categoriesElement.innerHTML = `
            <i class="fas fa-info-circle" style="color: #3b82f6;"></i>
            <span>Planos combinados: ${Array.from(uniqueCategories).map(c => 
                c === 'normal' ? 'Treino Normal' : 'Dança'
            ).join(' + ')}</span>
        `;
        planSummary.appendChild(categoriesElement);
    }
    
    // Features
    planFeatures.innerHTML = uniqueFeatures.map(f => `
        <div class="feature-item">
            <i class="fas fa-check-circle" style="color: #10b981;"></i>
            <span>${f}</span>
        </div>
    `).join('');
    
    // Total
    totalPrice.innerHTML = `R$ ${total.toFixed(2)}`;
    totalPrice.style.color = '#6366f1';
    totalPrice.style.fontSize = '28px';
}

// ============================================
// CONFIGURAR TABS DE PAGAMENTO
// ============================================
function setupPaymentTabs() {
    const tabsContainer = document.getElementById('paymentTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <button class="payment-tab pix active" onclick="switchTab('pix')">
            <i class="fas fa-qrcode"></i>
            <span>PIX</span>
        </button>
        <button class="payment-tab credit" onclick="switchTab('credit')">
            <i class="fas fa-credit-card"></i>
            <span>Cartão</span>
        </button>
        <button class="payment-tab boleto" onclick="switchTab('boleto')">
            <i class="fas fa-barcode"></i>
            <span>Boleto</span>
        </button>
    `;
    
    // Garantir que a primeira tab (PIX) esteja ativa
    switchTab('pix');
}

// ============================================
// ALTERNAR TABS DE PAGAMENTO
// ============================================
function switchTab(tab) {
    // Atualizar tabs
    document.querySelectorAll('.payment-tab').forEach(t => {
        t.classList.remove('active');
    });
    const selectedTab = document.querySelector(`.payment-tab.${tab}`);
    if (selectedTab) selectedTab.classList.add('active');
    
    // Mostrar conteúdo correspondente
    document.querySelectorAll('.payment-content').forEach(c => {
        c.classList.remove('active');
    });
    const content = document.getElementById(`${tab}Content`);
    if (content) content.classList.add('active');
}

// ============================================
// PROCESSAR PAGAMENTO PIX
// ============================================
async function processPixPayment() {
    const button = document.getElementById('pixButton');
    if (!button) return;
    
    await processPayment('pix', button);
}

// ============================================
// PROCESSAR PAGAMENTO COM CARTÃO
// ============================================
async function processCardPayment() {
    const button = document.getElementById('cardButton');
    if (!button) return;
    
    // Validar dados do cartão
    if (!validateCardData()) {
        return;
    }
    
    await processPayment('credit', button);
}

// ============================================
// PROCESSAR PAGAMENTO COM BOLETO
// ============================================
async function processBoletoPayment() {
    const button = document.getElementById('boletoButton');
    if (!button) return;
    
    await processPayment('boleto', button);
}

// ============================================
// FUNÇÃO GENÉRICA DE PROCESSAMENTO
// ============================================
async function processPayment(method, button) {
    if (!currentUser) {
        showError('Usuário não autenticado');
        return;
    }
    
    if (selectedPlans.length === 0) {
        showError('Nenhum plano selecionado');
        return;
    }
    
    // Desabilitar botão
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    try {
        console.log(`📤 Processando pagamento via ${method} para planos:`, selectedPlans);
        
        // Coletar dados do pagamento
        const paymentData = {
            userId: currentUser.id,
            planIds: selectedPlans,
            paymentMethod: method,
            payerInfo: {
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone || '',
                documentType: 'CPF',
                documentNumber: extractCPF(document.getElementById('cardCpf')?.value) || '00000000000'
            }
        };
        
        // Adicionar dados específicos do cartão se for crédito
        if (method === 'credit') {
            paymentData.cardInfo = {
                number: document.getElementById('cardNumber')?.value.replace(/\s/g, ''),
                expiry: document.getElementById('cardExpiry')?.value,
                cvv: document.getElementById('cardCvv')?.value,
                name: document.getElementById('cardName')?.value,
                installments: document.getElementById('installments')?.value
            };
        }
        
        const response = await fetch(`${API}/plans/user/${currentUser.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        console.log('📥 Resposta do servidor:', data);
        
        if (data.success) {
            // Processar baseado no método
            if (method === 'pix') {
                showPixPayment(data.data);
            } else if (method === 'boleto') {
                showBoletoPayment(data.data);
            } else {
                showSuccessModal();
            }
        } else {
            showError(data.error || 'Erro ao processar pagamento');
            button.disabled = false;
            button.innerHTML = originalText;
        }
        
    } catch (error) {
        console.error('❌ Erro no pagamento:', error);
        showError('Erro de conexão com o servidor');
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// ============================================
// VALIDAR DADOS DO CARTÃO
// ============================================
function validateCardData() {
    const number = document.getElementById('cardNumber')?.value.replace(/\s/g, '') || '';
    const expiry = document.getElementById('cardExpiry')?.value || '';
    const cvv = document.getElementById('cardCvv')?.value || '';
    const name = document.getElementById('cardName')?.value || '';
    const cpf = document.getElementById('cardCpf')?.value || '';
    
    if (number.length < 16) {
        showError('Número do cartão inválido');
        return false;
    }
    
    if (!expiry.match(/^\d{2}\/\d{2}$/)) {
        showError('Data de validade inválida (use MM/AA)');
        return false;
    }
    
    if (cvv.length < 3) {
        showError('CVV inválido');
        return false;
    }
    
    if (name.length < 5) {
        showError('Nome no cartão inválido');
        return false;
    }
    
    if (cpf.length < 11) {
        showError('CPF inválido');
        return false;
    }
    
    return true;
}

// ============================================
// EXTRAIR CPF (remover máscara)
// ============================================
function extractCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '');
}

// ============================================
// MOSTRAR PAGAMENTO PIX
// ============================================
function showPixPayment(data) {
    const qrContainer = document.getElementById('qrCodeContainer');
    const pixCode = document.getElementById('pixCode');
    
    if (qrContainer && data.qr_code_base64) {
        qrContainer.innerHTML = `<img src="data:image/png;base64,${data.qr_code_base64}" alt="QR Code PIX">`;
    }
    
    if (pixCode && data.qr_code) {
        pixCode.value = data.qr_code;
    }
    
    // Mostrar notificação
    showNotification('Pagamento PIX gerado! Escaneie o código ou copie a chave.', 'success');
}

// ============================================
// MOSTRAR PAGAMENTO BOLETO
// ============================================
function showBoletoPayment(data) {
    if (data.boleto_url) {
        window.open(data.boleto_url, '_blank');
    }
    
    showNotification('Boleto gerado! Verifique sua caixa de email.', 'success');
    
    // Mostrar modal de sucesso
    setTimeout(() => {
        showSuccessModal();
    }, 2000);
}

// ============================================
// COPIAR CÓDIGO PIX
// ============================================
function copyPixCode() {
    const input = document.getElementById('pixCode');
    if (!input) return;
    
    input.select();
    document.execCommand('copy');
    
    showNotification('Código PIX copiado!', 'success');
}

// ============================================
// MOSTRAR MODAL DE SUCESSO (VERSÃO ATUALIZADA)
// ============================================
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Limpar seleção da sessionStorage
    sessionStorage.removeItem('selectedPlans');
    
    // ATUALIZAR OS DADOS DO USUÁRIO NO LOCALSTORAGE
    refreshUserDataAfterPayment();
    
    // Contador regressivo
    let seconds = 5;
    const countdown = document.getElementById('countdown');
    
    const interval = setInterval(() => {
        seconds--;
        if (countdown) {
            countdown.textContent = `Redirecionando em ${seconds} segundos...`;
        }
        
        if (seconds === 0) {
            clearInterval(interval);
            redirectToAgenda();
        }
    }, 1000);
}

// ============================================
// FUNÇÃO PARA ATUALIZAR DADOS DO USUÁRIO APÓS PAGAMENTO
// ============================================
async function refreshUserDataAfterPayment() {
    if (!currentUser) return;
    
    try {
        console.log('🔄 Atualizando dados do usuário após pagamento...');
        
        // Tentar buscar da rota /me (se existir)
        const response = await fetch(`${API}/auth/me`, {
            credentials: 'include',
            headers: {
                'X-User-ID': currentUser.id
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const updatedUser = data.user || data.data || data;
            
            if (updatedUser) {
                // Atualizar currentUser
                currentUser = { ...currentUser, ...updatedUser };
                
                // Salvar no localStorage
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                console.log('✅ Dados do usuário atualizados:', currentUser);
            }
        } else {
            // Fallback: buscar status da assinatura
            const subResponse = await fetch(`${API}/payments/subscription/status/${currentUser.id}`, {
                credentials: 'include'
            });
            
            if (subResponse.ok) {
                const subData = await subResponse.json();
                const data = subData.data || subData;
                
                if (data.plan || data.subscription) {
                    // Atualizar currentUser com os dados recebidos
                    currentUser.plan = data.plan || currentUser.plan;
                    currentUser.subscription = data.subscription || currentUser.subscription;
                    
                    // Se tiver planos no formato antigo, converter
                    if (currentUser.plan && !currentUser.plans) {
                        if (typeof normalizeUserPlans === 'function') {
                            normalizeUserPlans();
                        } else {
                            // Fallback manual
                            currentUser.plans = [{
                                id: currentUser.plan.id || 'normal_2x',
                                name: currentUser.plan.name || 'Plano Ativo',
                                categoria: currentUser.plan.categoria || 'normal',
                                aulasPorSemana: currentUser.plan.aulasPorSemana || 2
                            }];
                        }
                    }
                    
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    console.log('✅ Dados atualizados via subscription/status');
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar dados após pagamento:', error);
    }
}

// ============================================
// FUNÇÃO PARA NORMALIZAR PLANOS (cópia do main-new.js)
// ============================================
function normalizeUserPlans() {
    if (!currentUser) return;
    if (currentUser.isAdmin) return;

    // Se já tem a estrutura nova, manter
    if (currentUser.plans && Array.isArray(currentUser.plans)) {
        return;
    }

    // Migrar da estrutura antiga para a nova
    const planAntigo = currentUser.plan || currentUser.subscription;
    
    if (planAntigo && planAntigo.active) {
        const planId = planAntigo.id || planAntigo.planType || 'normal_2x';
        const planData = PLANS[planId] || {};
        
        currentUser.plans = [{
            id: planId,
            name: planData.name || planAntigo.name || planId,
            categoria: planData.categoria || planAntigo.categoria || 'normal',
            aulasPorSemana: planData.aulasPorSemana || planAntigo.aulasPorSemana || 2,
            horariosPermitidos: planData.horariosPermitidos || 
                (planData.categoria === 'danca' ? [14,15] : [6,7,8,9,10,11,12,16,17,18,19]),
            color: planData.color || '#6366f1',
            icon: planData.icon || 'fa-crown',
            price: planData.price || 0,
            active: true,
            status: 'active'
        }];
        
        delete currentUser.plan;
    } else {
        currentUser.plans = [];
    }
}

// ============================================
// REDIRECIONAR PARA AGENDA
// ============================================
function redirectToAgenda() {
    // Forçar recarga da página para atualizar todos os dados
    window.location.href = '/';
    
    // Alternativa: se quiser evitar recarga, use:
    // localStorage.setItem('forceUserRefresh', 'true');
    // window.location.href = '/';
}

// ============================================
// MOSTRAR NOTIFICAÇÃO
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

// ============================================
// MOSTRAR ERRO
// ============================================
function showError(message, redirect = false) {
    showNotification(message, 'error');
    
    if (redirect) {
        setTimeout(() => {
            window.location.href = '/plans';
        }, 2000);
    }
}

// ============================================
// CORES DE NOTIFICAÇÃO
// ============================================
function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

// ============================================
// ÍCONES DE NOTIFICAÇÃO
// ============================================
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
// ADICIONAR ESTILOS ADICIONAIS
// ============================================
function addCheckoutStyles() {
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
        
        .plan-detail {
            transition: all 0.3s ease;
            border-radius: 8px;
            margin-bottom: 15px !important;
        }
        
        .plan-detail:hover {
            transform: translateX(5px);
            background: #f8fafc;
        }
        
        .categories-summary {
            display: flex;
            align-items: center;
            gap: 8px;
            animation: fadeIn 0.5s ease;
            border: 1px solid #bfdbfe;
        }
        
        .payment-tab {
            transition: all 0.3s ease;
        }
        
        .payment-tab:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .btn-pay {
            position: relative;
            overflow: hidden;
        }
        
        .btn-pay::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transform: translate(-50%, -50%);
            transition: width 0.3s, height 0.3s;
        }
        
        .btn-pay:hover::after {
            width: 300px;
            height: 300px;
        }
        
        .btn-pay:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .btn-pay:disabled::after {
            display: none;
        }
        
        @media (max-width: 768px) {
            .plan-detail {
                flex-direction: column;
                align-items: flex-start !important;
                gap: 10px;
            }
            
            .plan-price {
                align-self: flex-end;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.switchTab = switchTab;
window.processPixPayment = processPixPayment;
window.processCardPayment = processCardPayment;
window.processBoletoPayment = processBoletoPayment;
window.copyPixCode = copyPixCode;
window.redirectToAgenda = redirectToAgenda;

console.log('✅ checkout.js carregado com sucesso! (Modo Multiplanos)');