// ============================================
// checkout.js - Página de Checkout da FitLife
// VERSÃO ATUALIZADA - COM REMOÇÃO DE PLANOS
// ============================================

const API = 'https://jokesteronline.org/api';

// ============================================
// CONFIGURAÇÃO DOS PLANOS
// ============================================
const PLANS = {
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
    
    loadSelectedPlans();
    renderOrderSummary();
    setupPaymentTabs();
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
// FUNÇÃO PARA REMOVER PLANO DO CARRINHO
// ============================================
function removePlan(planId) {
    if (!selectedPlans || selectedPlans.length === 0) return;
    
    const index = selectedPlans.indexOf(planId);
    if (index > -1) {
        selectedPlans.splice(index, 1);
        
        sessionStorage.setItem('selectedPlans', JSON.stringify(selectedPlans));
        renderOrderSummary();
        
        showNotification(`Plano removido do carrinho`, 'info');
        
        if (selectedPlans.length === 0) {
            setTimeout(() => {
                if (confirm('Seu carrinho está vazio. Deseja escolher novos planos?')) {
                    window.location.href = '/plans';
                }
            }, 1500);
        }
    }
}

// ============================================
// RENDERIZAR RESUMO DO PEDIDO (COM BOTÕES DE REMOVER)
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
        
        const planElement = document.createElement('div');
        planElement.className = 'plan-detail';
        planElement.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-left: 4px solid ${plan.color};
            padding: 15px;
            margin-bottom: 10px;
            background: #f8fafc;
            border-radius: 8px;
            transition: all 0.3s;
        `;
        
        planElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <i class="fas ${plan.icon}" style="color: ${plan.color}; font-size: 20px;"></i>
                <div>
                    <div class="plan-name" style="font-weight: 600; color: #1f2937;">${plan.name}</div>
                    <div style="font-size: 12px; color: #6b7280;">${plan.categoria === 'normal' ? 'Treino' : 'Dança'}</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <span class="plan-price" style="color: ${plan.color}; font-weight: 700;">R$ ${plan.price.toFixed(2)}</span>
                <button onclick="removePlan('${planId}')" 
                    style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 5px 10px; transition: all 0.3s;"
                    title="Remover plano"
                    onmouseover="this.style.transform='scale(1.1)'"
                    onmouseout="this.style.transform='scale(1)'">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        
        planSummary.appendChild(planElement);
    });
    
    const addMoreButton = document.createElement('div');
    addMoreButton.style.cssText = `
        margin-top: 15px;
        text-align: center;
    `;
    addMoreButton.innerHTML = `
        <button onclick="window.location.href='/plans'" 
            style="background: none; border: 1px dashed #6366f1; color: #6366f1; padding: 10px 20px; border-radius: 8px; cursor: pointer; width: 100%; transition: all 0.3s;"
            onmouseover="this.style.background='#6366f110'"
            onmouseout="this.style.background='none'">
            <i class="fas fa-plus-circle"></i> Adicionar mais planos
        </button>
    `;
    planSummary.appendChild(addMoreButton);
    
    const uniqueFeatures = [...new Set(allFeatures)];
    
    planFeatures.innerHTML = '';
    
    if (uniqueCategories.size > 1) {
        const categoriesElement = document.createElement('div');
        categoriesElement.className = 'categories-summary';
        categoriesElement.style.cssText = `
            background: #f0f9ff;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            font-size: 13px;
            border: 1px solid #bfdbfe;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        categoriesElement.innerHTML = `
            <i class="fas fa-info-circle" style="color: #3b82f6;"></i>
            <span>Plano combinado: ${Array.from(uniqueCategories).map(c => 
                c === 'normal' ? 'Treino Normal' : 'Dança'
            ).join(' + ')}</span>
        `;
        planFeatures.appendChild(categoriesElement);
    }
    
    uniqueFeatures.forEach(f => {
        const featureItem = document.createElement('div');
        featureItem.className = 'feature-item';
        featureItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            color: var(--gray-700);
        `;
        featureItem.innerHTML = `
            <i class="fas fa-check-circle" style="color: #10b981; font-size: 14px;"></i>
            <span>${f}</span>
        `;
        planFeatures.appendChild(featureItem);
    });
    
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
    
    switchTab('pix');
}

// ============================================
// ALTERNAR TABS DE PAGAMENTO
// ============================================
function switchTab(tab) {
    document.querySelectorAll('.payment-tab').forEach(t => {
        t.classList.remove('active');
    });
    const selectedTab = document.querySelector(`.payment-tab.${tab}`);
    if (selectedTab) selectedTab.classList.add('active');
    
    document.querySelectorAll('.payment-content').forEach(c => {
        c.classList.remove('active');
    });
    const content = document.getElementById(`${tab}Content`);
    if (content) content.classList.add('active');
}

// ============================================
// PROCESSAR PAGAMENTO (COM VALIDAÇÃO)
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
    
    const normalCount = selectedPlans.filter(id => PLANS[id].categoria === 'normal').length;
    const dancaCount = selectedPlans.filter(id => PLANS[id].categoria === 'danca').length;
    
    if (normalCount > 1) {
        showError('Configuração inválida: múltiplos planos normais detectados');
        return;
    }
    
    if (dancaCount > 1) {
        showError('Configuração inválida: múltiplos planos de dança detectados');
        return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    try {
        console.log(`📤 Processando pagamento via ${method} para planos:`, selectedPlans);
        
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
            if (method === 'pix') {
                showPixPayment(data.data);
                startPaymentStatusCheck(data.data.id);
                
                // ===== NOVO: Salvar pagamento pendente =====
                sessionStorage.setItem('pendingPayment', JSON.stringify({
                    paymentId: data.data.id,
                    planIds: selectedPlans,
                    timestamp: Date.now()
                }));
                // ===========================================
                
            } else if (method === 'boleto') {
                showBoletoPayment(data.data);
                startPaymentStatusCheck(data.data.id);
                
                // ===== NOVO: Salvar pagamento pendente =====
                sessionStorage.setItem('pendingPayment', JSON.stringify({
                    paymentId: data.data.id,
                    planIds: selectedPlans,
                    timestamp: Date.now()
                }));
                // ===========================================
                
            } else {
                showSuccessModal();
            }
        }

        
    } catch (error) {
        console.error('❌ Erro no pagamento:', error);
        showError('Erro de conexão com o servidor');
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function processPixPayment() {
    const button = document.getElementById('pixButton');
    if (button) processPayment('pix', button);
}

function processCardPayment() {
    const button = document.getElementById('cardButton');
    if (!button) return;
    
    if (!validateCardData()) {
        return;
    }
    
    processPayment('credit', button);
}

function processBoletoPayment() {
    const button = document.getElementById('boletoButton');
    if (button) processPayment('boleto', button);
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

function extractCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '');
}

// ============================================
// MONITORAR STATUS DO PAGAMENTO
// ============================================
function startPaymentStatusCheck(paymentId) {
    console.log(`🔍 Monitorando pagamento ID: ${paymentId}`);
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkInterval = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`${API}/payments/payment/${paymentId}/status`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`📊 Status do pagamento (tentativa ${attempts}):`, data.status);
                
                if (data.status === 'approved') {
                    clearInterval(checkInterval);
                    await refreshUserDataAfterPayment();
                    showSuccessModal();
                } else if (data.status === 'rejected') {
                    clearInterval(checkInterval);
                    showError('Pagamento rejeitado. Tente novamente.');
                    
                    const pixButton = document.getElementById('pixButton');
                    if (pixButton) {
                        pixButton.disabled = false;
                        pixButton.innerHTML = '<i class="fas fa-qrcode"></i> Gerar Código PIX';
                    }
                }
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                showNotification('O pagamento está sendo processado. Você será redirecionado quando confirmado.', 'info');
                
                setTimeout(() => {
                    redirectToAgenda();
                }, 5000);
            }
            
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    }, 2000);
}

// ============================================
// MOSTRAR PAGAMENTO PIX
// ============================================
function showPixPayment(data) {
    const qrContainer = document.getElementById('qrCodeContainer');
    const pixCode = document.getElementById('pixCode');
    const pixButton = document.getElementById('pixButton');
    
    if (qrContainer && data.qr_code_base64) {
        qrContainer.innerHTML = `<img src="data:image/png;base64,${data.qr_code_base64}" alt="QR Code PIX" style="max-width: 250px;">`;
    }
    
    if (pixCode && data.qr_code) {
        pixCode.value = data.qr_code;
    }
    
    if (pixButton) {
        pixButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguardando pagamento...';
    }
    
    showNotification('Pagamento PIX gerado! Escaneie o código ou copie a chave.', 'success');
    
    const pixContainer = document.querySelector('.pix-container');
    if (pixContainer) {
        const waitingMsg = document.createElement('div');
        waitingMsg.className = 'pix-waiting';
        waitingMsg.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            font-size: 14px;
            text-align: center;
        `;
        waitingMsg.innerHTML = '<i class="fas fa-clock"></i> Aguardando confirmação do pagamento...';
        pixContainer.appendChild(waitingMsg);
    }
}

function showBoletoPayment(data) {
    if (data.boleto_url) {
        window.open(data.boleto_url, '_blank');
    }
    
    showNotification('Boleto gerado! Verifique sua caixa de email.', 'success');
    
    setTimeout(() => {
        showSuccessModal();
    }, 2000);
}

function copyPixCode() {
    const input = document.getElementById('pixCode');
    if (!input) return;
    
    input.select();
    document.execCommand('copy');
    
    showNotification('Código PIX copiado!', 'success');
}

// ============================================
// MODAL DE SUCESSO
// ============================================
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    sessionStorage.removeItem('selectedPlans');
    
    refreshUserDataAfterPayment();
    
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

async function refreshUserDataAfterPayment() {
    if (!currentUser) return;
    
    try {
        console.log('🔄 Atualizando dados do usuário após pagamento...');
        
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
                currentUser = { ...currentUser, ...updatedUser };
                localStorage.setItem('user', JSON.stringify(currentUser));
                console.log('✅ Dados do usuário atualizados:', currentUser);
            }
        } else {
            const subResponse = await fetch(`${API}/payments/subscription/status/${currentUser.id}`, {
                credentials: 'include'
            });
            
            if (subResponse.ok) {
                const subData = await subResponse.json();
                const data = subData.data || subData;
                
                if (data.plan || data.subscription) {
                    currentUser.plan = data.plan || currentUser.plan;
                    currentUser.subscription = data.subscription || currentUser.subscription;
                    
                    if (currentUser.plan && !currentUser.plans) {
                        if (typeof normalizeUserPlans === 'function') {
                            normalizeUserPlans();
                        } else {
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

function normalizeUserPlans() {
    if (!currentUser) return;
    if (currentUser.isAdmin) return;

    if (currentUser.plans && Array.isArray(currentUser.plans)) {
        return;
    }

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

function redirectToAgenda() {
    window.location.href = '/';
}

// ============================================
// SISTEMA DE NOTIFICAÇÕES
// ============================================
function showNotification(message, type = 'info') {
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function showError(message, redirect = false) {
    showNotification(message, 'error');
    
    if (redirect) {
        setTimeout(() => {
            window.location.href = '/plans';
        }, 2000);
    }
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
// ESTILOS ADICIONAIS
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
            background: #fef2f2 !important;
        }
        
        .plan-detail button {
            transition: all 0.3s;
        }
        
        .plan-detail button:hover {
            transform: scale(1.1);
        }
        
        .plan-detail.removing {
            animation: slideOut 0.3s ease forwards;
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
window.removePlan = removePlan;

console.log('✅ checkout.js carregado com sucesso! (Modo Multiplanos com Remoção)');