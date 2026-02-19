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
// INICIALIZAÇÃO COM DEBUG
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ===== CHECKOUT INICIADO =====');
    console.log('🌐 API URL:', API);
    
    // Verificar login
    const savedUser = localStorage.getItem('user');
    console.log('👤 Usuário no localStorage:', savedUser ? 'Encontrado' : 'Não encontrado');
    
    if (!savedUser) {
        console.log('❌ Nenhum usuário logado, redirecionando para home');
        window.location.href = '/';
        return;
    }
    
    try {
        currentUser = JSON.parse(savedUser);
        console.log('✅ Usuário carregado:', currentUser.email);
    } catch (e) {
        console.error('❌ Erro ao parsear usuário:', e);
        window.location.href = '/';
        return;
    }
    
    // Recuperar plano selecionado
    const planData = sessionStorage.getItem('selectedPlan');
    console.log('📦 Plano no sessionStorage:', planData ? 'Encontrado' : 'Não encontrado');
    
    if (!planData) {
        console.log('❌ Nenhum plano selecionado, redirecionando para plans');
        window.location.href = '/plans';
        return;
    }
    
    try {
        selectedPlan = JSON.parse(planData);
        console.log('✅ Plano carregado:', selectedPlan);
    } catch (e) {
        console.error('❌ Erro ao parsear plano:', e);
        window.location.href = '/plans';
        return;
    }
    
    // Atualizar resumo
    updateOrderSummary();
    
    // Carregar métodos de pagamento
    await loadPaymentMethods();
    
    // Renderizar tabs
    renderPaymentTabs();
    
    console.log('✅ Checkout inicializado com sucesso');
});

// ============================================
// RESUMO DO PEDIDO
// ============================================
function updateOrderSummary() {
    const plan = PLANS[selectedPlan.id] || selectedPlan;
    console.log('📊 Atualizando resumo do pedido:', plan);
    
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
    console.log('🔄 Carregando métodos de pagamento...');
    
    try {
        const response = await fetch(`${API}/payments/methods`);
        console.log('📥 Resposta de métodos:', response.status);
        
        const data = await response.json();
        console.log('📦 Dados de métodos:', data);
        
        if (data.success) {
            paymentMethods = data.data.filter(m => 
                ['pix', 'master', 'visa', 'elo', 'bolbradesco'].includes(m.id)
            );
            console.log('✅ Métodos filtrados:', paymentMethods);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar métodos:', error);
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
    console.log('🔄 Mudando método para:', method);
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
// PROCESSAR PAGAMENTO PIX - VERSÃO COM DEBUG
// ============================================
async function processPixPayment() {
    console.log('🚀 ===== INICIANDO PROCESSO PIX =====');
    
    const button = document.getElementById('pixButton');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PIX...';
    
    // Limpar QR Code anterior
    document.getElementById('qrCodeContainer').innerHTML = `
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <p>Conectando ao Mercado Pago...</p>
    `;
    
    try {
        console.log('1️⃣ Solicitando CPF...');
        const cpf = await askCPF();
        if (!cpf) {
            console.log('❌ CPF não fornecido, cancelando');
            resetPixButton();
            return;
        }
        console.log('✅ CPF fornecido:', cpf);
        
        // Validar CPF
        if (cpf.length !== 11) {
            console.error('❌ CPF inválido - comprimento:', cpf.length);
            showNotification('CPF deve ter 11 dígitos', 'error');
            resetPixButton();
            return;
        }
        
        console.log('2️⃣ Preparando payload...');
        const payload = {
            userId: currentUser.id,
            planType: selectedPlan.id,
            payerInfo: {
                documentNumber: cpf,
                name: currentUser.name,
                email: currentUser.email
            }
        };
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        
        console.log('3️⃣ Enviando requisição para:', `${API}/payments/pix`);
        
        const response = await fetch(`${API}/payments/pix`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('4️⃣ Status da resposta:', response.status);
        console.log('📋 Headers:', response.headers);
        
        // Tentar ler a resposta como texto primeiro para debug
        const responseText = await response.text();
        console.log('5️⃣ Resposta bruta:', responseText);
        
        // Tentar parsear como JSON
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('6️⃣ Resposta parseada:', data);
        } catch (e) {
            console.error('❌ Erro ao parsear JSON:', e);
            console.error('❌ Resposta não é JSON válido:', responseText);
            throw new Error('Resposta inválida do servidor');
        }
        
        if (data.success && data.data) {
            console.log('✅ Pagamento criado com sucesso!');
            console.log('📊 Dados completos:', data.data);
            
            // Verificar cada campo
            console.log('   🔹 ID:', data.data.id);
            console.log('   🔹 Status:', data.data.status);
            console.log('   🔹 QR Code Base64:', data.data.qr_code_base64 ? 'Recebido' : 'Não recebido');
            console.log('   🔹 Código PIX:', data.data.copy_paste ? 'Recebido' : 'Não recebido');
            
            // Mostrar QR Code
            const qrContainer = document.getElementById('qrCodeContainer');
            
            if (data.data.qr_code_base64) {
                console.log('✅ Exibindo QR Code');
                qrContainer.innerHTML = `
                    <img src="data:image/png;base64,${data.data.qr_code_base64}" 
                         alt="QR Code PIX" 
                         style="max-width: 200px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px;">
                `;
            } else {
                console.warn('⚠️ QR Code não recebido');
                qrContainer.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 48px;"></i>
                    <p>QR Code não disponível. Use o código abaixo:</p>
                `;
            }
            
            // Mostrar código PIX
            if (data.data.copy_paste) {
                console.log('✅ Exibindo código PIX');
                document.getElementById('pixCode').value = data.data.copy_paste;
            } else {
                console.warn('⚠️ Código PIX não recebido');
                document.getElementById('pixCode').value = 'Código não disponível';
            }
            
            // Iniciar verificação de status
            if (data.data.id) {
                console.log('🔄 Iniciando verificação de status para ID:', data.data.id);
                startPaymentCheck(data.data.id);
            }
            
            showNotification('PIX gerado com sucesso!', 'success');
        } else {
            console.error('❌ Erro na resposta:', data.error || 'Erro desconhecido');
            showNotification(data.error || 'Erro ao gerar PIX', 'error');
            
            document.getElementById('qrCodeContainer').innerHTML = `
                <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 48px;"></i>
                <p>Erro: ${data.error || 'Tente novamente'}</p>
            `;
            
            resetPixButton();
        }
    } catch (error) {
        console.error('❌ ERRO CRÍTICO:', error);
        console.error('Stack:', error.stack);
        
        showNotification('Erro ao processar pagamento: ' + error.message, 'error');
        
        document.getElementById('qrCodeContainer').innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 48px;"></i>
            <p>Erro de conexão. Verifique o console.</p>
        `;
        
        resetPixButton();
    }
    
    console.log('🏁 ===== FIM DO PROCESSO PIX =====');
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
    console.log('🔄 Iniciando verificação de pagamento:', paymentId);
    
    let attempts = 0;
    const maxAttempts = 30; // 2.5 minutos
    
    if (qrCodeInterval) {
        clearInterval(qrCodeInterval);
    }
    
    qrCodeInterval = setInterval(async () => {
        attempts++;
        console.log(`⏱️ Verificação ${attempts}/${maxAttempts}`);
        
        try {
            const response = await fetch(`${API}/payments/payment/${paymentId}/status`);
            const data = await response.json();
            
            console.log('📊 Status do pagamento:', data);
            
            if (data.status === 'approved') {
                console.log('✅ Pagamento aprovado!');
                clearInterval(qrCodeInterval);
                showSuccessModal();
            } else if (attempts >= maxAttempts) {
                console.log('⏰ Tempo esgotado');
                clearInterval(qrCodeInterval);
                showNotification('Tempo esgotado. Gere um novo pagamento.', 'warning');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
        }
    }, 5000);
}

function showSuccessModal() {
    console.log('🎉 Mostrando modal de sucesso');
    
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
        console.log('✅ Usuário atualizado com plano:', currentUser.plan);
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
    console.log('🔄 Redirecionando para agenda');
    window.location.href = '/';
}

function copyPixCode() {
    const pixCode = document.getElementById('pixCode');
    pixCode.select();
    document.execCommand('copy');
    showNotification('Código PIX copiado!', 'success');
    console.log('✅ Código PIX copiado');
}

function showNotification(message, type = 'info') {
    console.log(`🔔 [${type}] ${message}`);
    
    // Tentar usar a notificação do main-new.js
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        // Fallback para alert
        alert(message);
    }
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

// Expor funções para o HTML
window.processPixPayment = processPixPayment;
window.processCardPayment = processCardPayment;
window.processBoletoPayment = processBoletoPayment;
window.switchPaymentMethod = switchPaymentMethod;
window.copyPixCode = copyPixCode;
window.redirectToAgenda = redirectToAgenda;

console.log('✅ checkout.js carregado com debug');