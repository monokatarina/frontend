// src/js/checkout.js
const API = 'https://jokesteronline.org/api';

// Estado global
let currentUser = null;
let selectedPlan = null;
let paymentMethods = [];
let currentMethod = 'pix';
let qrCodeInterval = null;

// Planos disponíveis
const PLANS = {
    basic: {
        id: 'basic',
        name: 'Básico',
        aulasPorSemana: 2,
        price: 1,
        description: 'Plano Básico - 2 aulas por semana',
        features: [
            '2 aulas por semana',
            'Acesso a todos horários',
            'Suporte por email',
            'Cancelamento a qualquer momento'
        ]
    },
    intermediate: {
        id: 'intermediate',
        name: 'Intermediário',
        aulasPorSemana: 3,
        price: 1,
        description: 'Plano Intermediário - 3 aulas por semana',
        features: [
            '3 aulas por semana',
            'Acesso a todos horários',
            'Suporte prioritário',
            'Cancelamento a qualquer momento'
        ]
    },
    advanced: {
        id: 'advanced',
        name: 'Avançado',
        aulasPorSemana: 4,
        price: 1,
        description: 'Plano Avançado - 4 aulas por semana',
        features: [
            '4 aulas por semana',
            'Acesso a todos horários',
            'Suporte VIP',
            'Cancelamento a qualquer momento'
        ]
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        aulasPorSemana: 5,
        price: 1,
        description: 'Plano Premium - 5 aulas por semana',
        features: [
            '5 aulas por semana',
            'Acesso a todos horários',
            'Suporte 24/7',
            'Cancelamento a qualquer momento'
        ]
    }
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar login
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    
    // Recuperar plano selecionado
    const planData = sessionStorage.getItem('selectedPlan');
    if (!planData) {
        window.location.href = '/plans';
        return;
    }
    
    selectedPlan = JSON.parse(planData);
    
    // Atualizar resumo
    updateOrderSummary();
    
    // Carregar métodos de pagamento
    await loadPaymentMethods();
    
    // Renderizar tabs
    renderPaymentTabs();
});

// ============================================
// RESUMO DO PEDIDO
// ============================================
function updateOrderSummary() {
    const plan = PLANS[selectedPlan.id] || selectedPlan;
    
    document.getElementById('planSummary').innerHTML = `
        <div class="plan-detail">
            <span class="plan-name">${plan.name}</span>
            <span class="plan-price">R$ ${plan.price},00</span>
        </div>
    `;
    
    document.getElementById('planFeatures').innerHTML = `
        ${plan.features.map(f => `
            <div class="feature-item">
                <i class="fas fa-check"></i>
                <span>${f}</span>
            </div>
        `).join('')}
    `;
    
    document.getElementById('totalPrice').textContent = `R$ ${plan.price},00`;
}

// ============================================
// MÉTODOS DE PAGAMENTO
// ============================================
async function loadPaymentMethods() {
    try {
        const response = await fetch(`${API}/payments/methods`);
        const data = await response.json();
        
        if (data.success) {
            paymentMethods = data.data.filter(m => 
                ['pix', 'master', 'visa', 'elo', 'bolbradesco'].includes(m.id)
            );
        }
    } catch (error) {
        console.error('Erro ao carregar métodos:', error);
    }
}

function renderPaymentTabs() {
    const tabsContainer = document.getElementById('paymentTabs');
    
    tabsContainer.innerHTML = `
        <button class="payment-tab pix active" onclick="switchPaymentMethod('pix')">
            <i class="fas fa-qrcode"></i>
            PIX
        </button>
        <button class="payment-tab credit" onclick="switchPaymentMethod('card')">
            <i class="fas fa-credit-card"></i>
            Cartão
        </button>
        <button class="payment-tab boleto" onclick="switchPaymentMethod('boleto')">
            <i class="fas fa-barcode"></i>
            Boleto
        </button>
    `;
    
    // Mostrar conteúdo PIX por padrão
    showPaymentContent('pix');
}

function switchPaymentMethod(method) {
    currentMethod = method;
    
    // Atualizar tabs
    document.querySelectorAll('.payment-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.payment-tab.${method === 'card' ? 'credit' : method}`).classList.add('active');
    
    // Mostrar conteúdo correspondente
    showPaymentContent(method);
}

function showPaymentContent(method) {
    document.querySelectorAll('.payment-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${method}Content`).classList.add('active');
}

// ============================================
// PROCESSAR PAGAMENTO PIX
// ============================================
async function processPixPayment() {
    const button = document.getElementById('pixButton');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PIX...';
    
    try {
        const cpf = await askCPF();
        if (!cpf) return;
        
        const response = await fetch(`${API}/payments/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                planType: selectedPlan.id,
                payerInfo: {
                    documentNumber: cpf,
                    name: currentUser.name,
                    email: currentUser.email
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mostrar QR Code
            const qrContainer = document.getElementById('qrCodeContainer');
            qrContainer.innerHTML = `
                <img src="data:image/png;base64,${data.data.qr_code_base64}" 
                     alt="QR Code PIX" style="max-width: 200px;">
            `;
            
            document.getElementById('pixCode').value = data.data.copy_paste;
            
            // Iniciar verificação de status
            startPaymentCheck(data.data.id);
            
            showNotification('PIX gerado com sucesso!', 'success');
        } else {
            showNotification(data.error || 'Erro ao gerar PIX', 'error');
            resetPixButton();
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao processar pagamento', 'error');
        resetPixButton();
    }
}

// ============================================
// PROCESSAR PAGAMENTO COM CARTÃO
// ============================================
async function processCardPayment() {
    const button = document.getElementById('cardButton');
    
    // Validar campos
    if (!validateCardFields()) {
        return;
    }
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    try {
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Aqui você integraria com o Mercado Pago
        showSuccessModal();
        
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao processar pagamento', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-lock"></i> Pagar com Cartão';
    }
}

// ============================================
// PROCESSAR PAGAMENTO COM BOLETO
// ============================================
async function processBoletoPayment() {
    const button = document.getElementById('boletoButton');
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando Boleto...';
    
    try {
        const cpf = await askCPF();
        if (!cpf) return;
        
        const response = await fetch(`${API}/payments/boleto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                planType: selectedPlan.id,
                payerInfo: {
                    documentNumber: cpf,
                    name: currentUser.name,
                    email: currentUser.email,
                    address: {
                        zipCode: '00000000',
                        street: 'Rua Exemplo',
                        number: '123',
                        city: 'Cidade',
                        state: 'SP'
                    }
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Abrir boleto em nova aba
            window.open(data.data.boleto_url, '_blank');
            
            showNotification('Boleto gerado com sucesso!', 'success');
            
            // Iniciar verificação de status
            startPaymentCheck(data.data.id);
        } else {
            showNotification(data.error || 'Erro ao gerar boleto', 'error');
            resetBoletoButton();
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao processar pagamento', 'error');
        resetBoletoButton();
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function askCPF() {
    return new Promise((resolve) => {
        const cpf = prompt('Digite seu CPF (somente números):');
        
        if (!cpf) {
            resolve(null);
            return;
        }
        
        const cleanCPF = cpf.replace(/\D/g, '');
        
        if (cleanCPF.length !== 11) {
            alert('CPF deve ter 11 dígitos');
            resolve(null);
            return;
        }
        
        resolve(cleanCPF);
    });
}

function validateCardFields() {
    const fields = {
        number: document.getElementById('cardNumber').value,
        expiry: document.getElementById('cardExpiry').value,
        cvv: document.getElementById('cardCvv').value,
        name: document.getElementById('cardName').value,
        cpf: document.getElementById('cardCpf').value
    };
    
    for (let [key, value] of Object.entries(fields)) {
        if (!value || value.trim() === '') {
            showNotification(`Campo ${key} é obrigatório`, 'error');
            return false;
        }
    }
    
    return true;
}

function startPaymentCheck(paymentId) {
    let attempts = 0;
    const maxAttempts = 30; // 2.5 minutos
    
    qrCodeInterval = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`${API}/payments/payment/${paymentId}/status`);
            const data = await response.json();
            
            if (data.status === 'approved') {
                clearInterval(qrCodeInterval);
                showSuccessModal();
            } else if (attempts >= maxAttempts) {
                clearInterval(qrCodeInterval);
                showNotification('Tempo esgotado. Gere um novo pagamento.', 'warning');
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    }, 5000);
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    
    // Atualizar usuário no localStorage (plano ativo)
    if (currentUser) {
        currentUser.plan = {
            id: selectedPlan.id,
            name: selectedPlan.name,
            aulasPorSemana: selectedPlan.aulasPorSemana,
            active: true
        };
        localStorage.setItem('user', JSON.stringify(currentUser));
    }
    
    // Countdown
    let seconds = 5;
    const countdownEl = document.getElementById('countdown');
    
    const interval = setInterval(() => {
        seconds--;
        countdownEl.textContent = `Redirecionando em ${seconds} segundos...`;
        
        if (seconds === 0) {
            clearInterval(interval);
            redirectToAgenda();
        }
    }, 1000);
}

function redirectToAgenda() {
    window.location.href = '/';
}

function copyPixCode() {
    const pixCode = document.getElementById('pixCode');
    pixCode.select();
    document.execCommand('copy');
    showNotification('Código PIX copiado!', 'success');
}

function showNotification(message, type = 'info') {
    // Usar função do main-new.js ou criar simples
    alert(message);
}

function resetPixButton() {
    const button = document.getElementById('pixButton');
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-qrcode"></i> Gerar Código PIX';
}

function resetBoletoButton() {
    const button = document.getElementById('boletoButton');
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-file-invoice"></i> Gerar Boleto';
}