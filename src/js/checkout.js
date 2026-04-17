
// ============================================

const API = 'https://jokesteronline.org/api';

// ============================================
// CONFIGURAÃ‡ÃƒO DOS PLANOS
// ============================================
let PLANS = {};

// ============================================
// ESTADO GLOBAL
// ============================================
let currentUser = null;
let selectedPlans = [];
let paymentData = {};

// ============================================
// VERIFICAR PAGAMENTO PENDENTE
// ============================================
function checkPendingPayment() {
    try {
        const pendingPayment = sessionStorage.getItem('pendingPayment');
        
        if (pendingPayment) {
            const payment = JSON.parse(pendingPayment);
            
            // Verificar se o pagamento tem menos de 30 minutos
            const now = Date.now();
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (now - payment.timestamp < thirtyMinutes) {
                console.log('⏳ Pagamento pendente encontrado:', payment.paymentId);
                
                // Mostrar notificação
                showNotification(
                    'Você tem um pagamento pendente. Aguardando confirmação...',
                    'info'
                );
                
                // Iniciar monitoramento
                if (payment.paymentId) {
                    startPaymentStatusCheck(payment.paymentId);
                }
            } else {
                // Pagamento expirado, remover
                sessionStorage.removeItem('pendingPayment');
                console.log('⏰ Pagamento pendente expirado, removido');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar pagamento pendente:', error);
    }
}

// ============================================
// INICIALIZAÃ‡ÃƒO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ðŸš€ Checkout Multiplanos iniciado');
    
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
        console.log('âŒ Usuário não logado, redirecionando...');
        window.location.href = '/';
        return;
    }
    
    try {
        currentUser = JSON.parse(savedUser);
        console.log('ðŸ‘¤ Usuário:', currentUser.name);
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        window.location.href = '/';
        return;
    }
    
    await loadSelectedPlans();
    await loadPlansConfig();  // <-- CARREGA PREÃ‡OS DO BACKEND
    
    setupPaymentTabs();
    addCheckoutStyles();
    
    // Verificar se hÃ¡ pagamento pendente
    checkPendingPayment();

    // BotÃ£o Copiar PIX
    const btnCopyPix = document.getElementById('btnCopyPix');
    if (btnCopyPix) {
        btnCopyPix.addEventListener('click', copyPixCode);
    }
    
    // BotÃ£o PIX
    const pixButton = document.getElementById('pixButton');
    if (pixButton) {
        pixButton.addEventListener('click', processPixPayment);
    }
    
    // BotÃ£o CartÃ£o
    const cardButton = document.getElementById('cardButton');
    if (cardButton) {
        cardButton.addEventListener('click', processCardPayment);
    }
    
    // BotÃ£o Boleto
    const boletoButton = document.getElementById('boletoButton');
    if (boletoButton) {
        boletoButton.addEventListener('click', processBoletoPayment);
    }
    
    // BotÃ£o Redirecionar
    const btnRedirect = document.getElementById('btnRedirect');
    if (btnRedirect) {
        btnRedirect.addEventListener('click', redirectToAgenda);
    }
    
    // Configurar botÃµes iniciais
    setupRemoveButtons();
    
    // Observar mudanÃ§as no DOM para configurar novos botÃµes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                setupRemoveButtons();
            }
        });
    });
    
    // Observar o container de planSummary
    const planSummary = document.getElementById('planSummary');
    if (planSummary) {
        observer.observe(planSummary, { childList: true, subtree: true });
    }

    // Inicializar campos do cartÃ£o se a aba ativa for crÃ©dito
    const activeTab = document.querySelector('.payment-tab.active');
    if (activeTab && activeTab.dataset.tab === 'credit') {
        setTimeout(initCardFields, 200);
    }
});
// ============================================
// BUSCAR CONFIGURAÃ‡ÃƒO DOS PLANOS DO BACKEND
// ============================================
async function loadPlansConfig() {
    try {
        console.log('Checkout: Buscando configuração dos planos...');
        
        const response = await fetch(`${API}/plans/config`);
        const result = await response.json();
        
        if (result.success && result.data) {
            PLANS = result.data;
            console.log('âœ… Checkout: Planos carregados:', PLANS);
            
            // Renderizar o resumo com os dados corretos
            renderOrderSummary();
        } else {
            console.error('âŒ Erro ao carregar planos:', result.error);
            showError('Erro ao carregar dados dos planos');
        }
        
    } catch (error) {
        console.error('âŒ Erro na requisição:', error);
        showError('Erro de conexão com o servidor');
    }
}

// ============================================
// CARREGAR PLANOS SELECIONADOS
// ============================================
function loadSelectedPlans() {
    const plansStr = sessionStorage.getItem('selectedPlans');
    
    if (!plansStr) {
        console.log('âŒ Nenhum plano selecionado');
        showError('Nenhum plano foi selecionado', true);
        return;
    }
    
    try {
        selectedPlans = JSON.parse(plansStr);
        console.log('ðŸ“‹ Planos selecionados:', selectedPlans);
        
        if (selectedPlans.length === 0) {
            showError('Selecione pelo menos um plano', true);
        }
    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        showError('Erro ao carregar planos selecionados', true);
    }
}

// ============================================
// FUNÃ‡ÃƒO PARA REMOVER PLANO DO CARRINHO
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
// BOTÕES DE REMOVER PLANO
// ============================================
function setupRemoveButtons() {
    document.querySelectorAll('.btn-remove-plan').forEach(btn => {
        // Remover listeners antigos para não duplicar
        btn.removeEventListener('click', handleRemoveClick);
        btn.addEventListener('click', handleRemoveClick);
    });
    console.log('🔄 Botões de remover configurados:', document.querySelectorAll('.btn-remove-plan').length);
}

function handleRemoveClick(e) {
    e.preventDefault();
    const planId = this.dataset.planId;
    console.log('🗑️ Removendo plano:', planId);
    removePlan(planId);
}

// ============================================
// RENDERIZAR RESUMO DO PEDIDO (COM BOTÃ•ES DE REMOVER)
// ============================================
// Modifique a funÃ§Ã£o renderOrderSummary para incluir o desconto
function renderOrderSummary() {
    const planSummary = document.getElementById('planSummary');
    const planFeatures = document.getElementById('planFeatures');
    const totalPrice = document.getElementById('totalPrice');
    
    if (!planSummary || !planFeatures || !totalPrice) {
        console.error('Elementos do resumo não encontrados');
        return;
    }
    
    // PEGAR PLANOS EXISTENTES DO USUÁRIO
    const planosExistentes = currentUser?.plans || [];
    
    console.log('👤 Planos existentes do usuário:', planosExistentes);
    
    // Usar o utilitário de desconto com os planos existentes
    const desconto = DiscountUtils.calculateDiscountedPrice(
        selectedPlans,
        PLANS,
        planosExistentes
    );
    
    console.log('💰 Resultado do desconto:', desconto);
    
    let allFeatures = [];
    let uniqueCategories = new Set();
    
    planSummary.innerHTML = '';
    
    selectedPlans.forEach(planId => {
        const plan = PLANS[planId];
        if (!plan) return;
        
        uniqueCategories.add(plan.categoria);
        allFeatures = [...allFeatures, ...plan.features];
        
        // Verificar se este plano tem desconto
        const planoComDesconto = desconto.planosComDesconto.find(p => p.id === planId);
        const temDesconto = !!planoComDesconto;
        const precoFinal = temDesconto ? planoComDesconto.valorComDesconto : plan.price;
        
        // Verificar motivo do desconto
        const usuarioJaTemNormal = currentUser?.plans?.some(p => p.categoria === 'normal');
        const motivoDesconto = usuarioJaTemNormal ?
            'Desconto por já possuir plano normal' :
            'Desconto por compra combinada';
        
        const planElement = document.createElement('div');
        planElement.className = 'plan-detail';
        planElement.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-left: 4px solid ${plan.color};
            padding: 15px;
            margin-bottom: 10px;
            background: ${temDesconto ? '#f0fdf4' : '#f8fafc'};
            border-radius: 8px;
            transition: all 0.3s;
            ${temDesconto ? 'border-left-color: #10b981;' : ''}
        `;
        
        planElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <i class="fas ${plan.icon}" style="color: ${plan.color}; font-size: 20px;"></i>
                <div>
                    <div class="plan-name" style="font-weight: 600; color: #1f2937;">${plan.name}</div>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${plan.categoria === 'normal' ? 'Treino' : 'Dança'}
                        ${temDesconto ? `
                            <span style="color: #10b981; margin-left: 8px;" title="${motivoDesconto}">
                                <i class="fas fa-tag"></i> 15% OFF
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="text-align: right;">
                    ${temDesconto ? `
                        <span style="font-size: 12px; color: #9ca3af; text-decoration: line-through;">R$ ${plan.price.toFixed(2)}</span><br>
                        <span class="plan-price" style="color: #10b981; font-weight: 700;">R$ ${precoFinal.toFixed(2)}</span>
                    ` : `
                        <span class="plan-price" style="color: ${plan.color}; font-weight: 700;">R$ ${plan.price.toFixed(2)}</span>
                    `}
                </div>
                <button class="btn-remove-plan" data-plan-id="${planId}" 
                    style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 5px 10px; transition: all 0.3s;"
                    title="Remover plano">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        
        planSummary.appendChild(planElement);
    });
    
    // Mostrar badge informando que usuário já tem plano normal
    if (currentUser?.plans?.some(p => p.categoria === 'normal') && desconto.temDesconto) {
        const infoBadge = document.createElement('div');
        infoBadge.style.cssText = `
            background: #e0f2fe;
            border: 1px solid #38bdf8;
            color: #0369a1;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        infoBadge.innerHTML = `
            <i class="fas fa-info-circle" style="font-size: 18px;"></i>
            <span>
                <strong>Você já possui um plano normal!</strong>
                Por isso, ganhou 15% de desconto nos planos de dança.
            </span>
        `;
        planSummary.appendChild(infoBadge);
    }
    
    // Adicionar badge de desconto
    if (desconto.temDesconto) {
        const motivo = currentUser?.plans?.some(p => p.categoria === 'normal') ?
            'Desconto por já possuir plano normal' :
            'Desconto por compra combinada (Normal + Dança)';
            
        const discountBadge = DiscountUtils.createDiscountBadge(
            desconto.planosComDesconto,
            desconto.economia,
            motivo
        );
        if (discountBadge) {
            planSummary.appendChild(discountBadge);
        }
    }
    
    // Adicionar botão "Adicionar mais planos"
    const addMoreButton = document.createElement('div');
    addMoreButton.style.cssText = `
        margin-top: 15px;
        text-align: center;
    `;
    addMoreButton.innerHTML = `
        <button id="btnAddMorePlans" 
            style="background: none; border: 1px dashed #6366f1; color: #6366f1; padding: 10px 20px; border-radius: 8px; cursor: pointer; width: 100%; transition: all 0.3s;">
            <i class="fas fa-plus-circle"></i> Adicionar mais planos
        </button>
    `;
    planSummary.appendChild(addMoreButton);
    
    // Features únicas
    const uniqueFeatures = [...new Set(allFeatures)];
    
    planFeatures.innerHTML = '';
    
    // Mostrar combinação de categorias
    if (uniqueCategories.size > 1) {
        const categoriesElement = document.createElement('div');
        categoriesElement.className = 'categories-summary';
        categoriesElement.style.cssText = `
            background: #f0f9ff;
            padding: 12px;
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
    
    // Listar features
    uniqueFeatures.forEach(f => {
        const featureItem = document.createElement('div');
        featureItem.className = 'feature-item';
        featureItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            color: #374151;
        `;
        featureItem.innerHTML = `
            <i class="fas fa-check-circle" style="color: #10b981; font-size: 14px;"></i>
            <span>${f}</span>
        `;
        planFeatures.appendChild(featureItem);
    });
    
    // Adicionar resumo de economia
    if (desconto.temDesconto) {
        const economySummary = DiscountUtils.createEconomySummary(
            desconto.totalOriginal,
            desconto.totalComDesconto,
            desconto.economia,
            desconto.percentualEconomia
        );
        if (economySummary) {
            planFeatures.appendChild(economySummary);
        }
    }
    
    // Atualizar total
    totalPrice.innerHTML = `R$ ${desconto.totalComDesconto.toFixed(2)}`;
    totalPrice.style.color = desconto.temDesconto ? '#10b981' : '#6366f1';
    totalPrice.style.fontSize = '28px';
    totalPrice.style.fontWeight = '700';
    
    // Configurar botão adicionar mais
    const btnAddMore = document.getElementById('btnAddMorePlans');
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => {
            window.location.href = '/plans';
        });
    }
    
    // Configurar botões de remover
    setupRemoveButtons();
}
// ============================================
// CONFIGURAR TABS DE PAGAMENTO
// ============================================
function setupPaymentTabs() {
    const tabsContainer = document.getElementById('paymentTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <button class="payment-tab pix active" data-tab="pix">
            <i class="fas fa-qrcode"></i>
            <span>PIX</span>
        </button>
        <button class="payment-tab credit" data-tab="credit">
            <i class="fas fa-credit-card"></i>
            <span>Cartao</span>
        </button>
        <button class="payment-tab boleto" data-tab="boleto">
            <i class="fas fa-barcode"></i>
            <span>Boleto</span>
        </button>
    `;
    
    // Adicionar event listeners para as tabs
    document.querySelectorAll('.payment-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
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
    const contentIdMap = {
        pix: 'pixContent',
        credit: 'cardContent',
        boleto: 'boletoContent'
    };
    const content = document.getElementById(contentIdMap[tab] || `${tab}Content`);
    if (content) {
        content.classList.add('active');

        if (tab === 'credit') {
            // Aguarda renderizaÃ§Ã£o do conteÃºdo da aba antes de inicializar mÃ¡scaras
            setTimeout(initCardFields, 100);
        }
    }
}
// ============================================
// PROCESSAR PAGAMENTO (COM CONFIRMAÃ‡ÃƒO DE DOWNGRADE)
// ============================================
async function processPayment(method, button) {
    if (!currentUser) {
        showError('Usuoario nao autenticado');
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
        console.log(`ðŸ“¤ Processando pagamento via ${method} para planos:`, selectedPlans);
        
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
            if (!validateCardData()) {
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }

            const expiryValue = document.getElementById('cardExpiry')?.value || '';
            const [month, year] = expiryValue.split('/');
            const cpfValue = document.getElementById('cardCpf')?.value || '';

            paymentData.cardInfo = {
                number: document.getElementById('cardNumber')?.value.replace(/\s/g, ''),
                expiry: expiryValue,
                expiry_month: parseInt(month, 10),
                expiry_year: parseInt(`20${year}`, 10),
                cvv: document.getElementById('cardCvv')?.value,
                name: document.getElementById('cardName')?.value,
                installments: document.getElementById('installments')?.value
            };

            paymentData.payerInfo.documentNumber = extractCPF(cpfValue);
        }
        
        const response = await fetch(`${API}/plans/user/${currentUser.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        console.log('ðŸ“¥ Resposta do servidor:', data);
        
        // ===== NOVO: TRATAR CONFIRMAÃ‡ÃƒO DE DOWNGRADE =====
        if (data.requiresConfirmation && data.analise?.paraDowngrade?.length > 0) {
            // Mostrar modal de confirmaÃ§Ã£o de downgrade
            showDowngradeConfirmation(data.analise, method);
            
            // Reativar o botÃ£o
            button.disabled = false;
            button.innerHTML = originalText;
            return;
        }
        // =================================================
        
        if (data.success) {
            if (method === 'pix') {
                showPixPayment(data.data);
                startPaymentStatusCheck(data.data.id);
                
                // Salvar pagamento pendente
                sessionStorage.setItem('pendingPayment', JSON.stringify({
                    paymentId: data.data.id,
                    planIds: selectedPlans,
                    timestamp: Date.now()
                }));
                
            } else if (method === 'boleto') {
                showBoletoPayment(data.data);
                startPaymentStatusCheck(data.data.id);
                
                sessionStorage.setItem('pendingPayment', JSON.stringify({
                    paymentId: data.data.id,
                    planIds: selectedPlans,
                    timestamp: Date.now()
                }));
                
            } else {
                if (data.data?.status === 'approved') {
                    showSuccessModal();
                } else {
                    startPaymentStatusCheck(data.data.id);
                    sessionStorage.setItem('pendingPayment', JSON.stringify({
                        paymentId: data.data.id,
                        planIds: selectedPlans,
                        timestamp: Date.now()
                    }));
                    showNotification('Pagamento com cartao enviado. Aguardando confirmacao.', 'info');
                }
            }
        } else {
            // Se nÃ£o foi success e nÃ£o Ã© confirmaÃ§Ã£o, mostrar erro
            showError(data.error || 'Erro no processamento');
            button.disabled = false;
            button.innerHTML = originalText;
        }
        
    } catch (error) {
        console.error('âŒ Erro no pagamento:', error);
        showError('Erro de conexão com o servidor');
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// ============================================
// NOVA FUNÃ‡ÃƒO: MOSTRAR MODAL DE CONFIRMAÃ‡ÃƒO DE DOWNGRADE
// ============================================
function showDowngradeConfirmation(analise, paymentMethod) {
    // Remover modal existente se houver
    const existingModal = document.getElementById('downgradeConfirmModal');
    if (existingModal) existingModal.remove();
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'downgradeConfirmModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    // Detalhes do downgrade
    const downgradeDetails = analise.paraDowngrade.map(d => 
        `<li style="margin: 10px 0; color: #f59e0b;">
            <i class="fas fa-arrow-down" style="color: #ef4444;"></i>
            <strong>${d.de}</strong> â†’ <strong>${d.para}</strong> (${d.categoria})
        </li>`
    ).join('');
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.5s;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: #fee2e2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #ef4444;"></i>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 10px;">âš ï¸ ATENÇÃO: Downgrade Detectado!</h2>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;">
                <p style="color: #b91c1c; font-weight: 600; margin-bottom: 15px;">
                    <i class="fas fa-info-circle"></i>
                    Ao confirmar o downgrade:
                </p>
                
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0; color: #dc2626;">
                        <i class="fas fa-times-circle"></i>
                        <strong>TODAS as suas aulas fixas serão canceladas</strong>
                    </li>
                    <li style="margin: 10px 0; color: #dc2626;">
                        <i class="fas fa-times-circle"></i>
                        <strong>TODOS os seus agendamentos futuros serão removidos</strong>
                    </li>
                    <li style="margin: 10px 0; color: #059669;">
                        <i class="fas fa-check-circle"></i>
                        Seus planos serão alterados para: 
                        <strong>${analise.paraDowngrade.map(d => d.para).join(', ')}</strong>
                    </li>
                </ul>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <p style="color: #856404; margin: 0;">
                        <i class="fas fa-clock"></i>
                        Voco precisara fazer novos agendamentos dentro do limite do novo plano.
                    </p>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 30px;">
                <button id="cancelDowngradeBtn" style="
                    flex: 1;
                    padding: 15px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    background: white;
                    color: #4b5563;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    <i class="fas fa-times"></i>
                    Cancelar
                </button>
                
                <button id="confirmDowngradeBtn" style="
                    flex: 1;
                    padding: 15px;
                    border: none;
                    border-radius: 12px;
                    background: #ef4444;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    <i class="fas fa-check"></i>
                    Confirmar Downgrade
                </button>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                Esta ação não pode ser desfeita. Todos os agendamentos futuros serão permanentemente removidos.
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar eventos
    document.getElementById('cancelDowngradeBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('confirmDowngradeBtn').addEventListener('click', () => {
        modal.remove();
        // Reprocessar pagamento com confirmaÃ§Ã£o
        processPaymentWithConfirmation(paymentMethod);
    });
}

// ============================================
// MOSTRAR DESCONTO NO RESUMO
// ============================================
function showDiscountInfo(descontoInfo) {
    if (!descontoInfo || descontoInfo.economia <= 0) return;
    
    const planFeatures = document.getElementById('planFeatures');
    if (!planFeatures) return;
    
    // Verificar se jÃ¡ existe elemento de desconto
    const existingDiscount = document.querySelector('.discount-banner');
    if (existingDiscount) existingDiscount.remove();
    
    const discountElement = document.createElement('div');
    discountElement.className = 'discount-banner';
    discountElement.style.cssText = `
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 15px;
        border-radius: 12px;
        margin: 15px 0;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideIn 0.5s ease;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    `;
    
    discountElement.innerHTML = `
        <div style="background: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-tag" style="color: #10b981; font-size: 20px;"></i>
        </div>
        <div style="flex: 1;">
            <strong style="font-size: 16px;">ðŸŽ‰ DESCONTO APLICADO!</strong>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">
                VocÃª economizou <strong>R$ ${descontoInfo.economia.toFixed(2)}</strong> 
                (${descontoInfo.percentualEconomia}% de desconto) em planos de danÃ§a!
            </p>
        </div>
    `;
    
    planFeatures.insertBefore(discountElement, planFeatures.firstChild);
}


// ============================================
// NOVA FUNÃ‡ÃƒO: PROCESSAR PAGAMENTO COM CONFIRMAÃ‡ÃƒO
// ============================================
async function processPaymentWithConfirmation(method) {
    const button = document.getElementById(method === 'pix' ? 'pixButton' : 
                                          method === 'credit' ? 'cardButton' : 'boletoButton');
    
    if (!button) return;
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    try {
        const paymentData = {
            userId: currentUser.id,
            planIds: selectedPlans,
            paymentMethod: method,
            action: 'confirm_downgrade',  // <-- IMPORTANTE: enviar confirmaÃ§Ã£o
            payerInfo: {
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone || '',
                documentType: 'CPF',
                documentNumber: extractCPF(document.getElementById('cardCpf')?.value) || '00000000000'
            }
        };
        
        if (method === 'credit') {
            if (!validateCardData()) {
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }

            const expiryValue = document.getElementById('cardExpiry')?.value || '';
            const [month, year] = expiryValue.split('/');
            const cpfValue = document.getElementById('cardCpf')?.value || '';

            paymentData.cardInfo = {
                number: document.getElementById('cardNumber')?.value.replace(/\s/g, ''),
                expiry: expiryValue,
                expiry_month: parseInt(month, 10),
                expiry_year: parseInt(`20${year}`, 10),
                cvv: document.getElementById('cardCvv')?.value,
                name: document.getElementById('cardName')?.value,
                installments: document.getElementById('installments')?.value
            };

            paymentData.payerInfo.documentNumber = extractCPF(cpfValue);
        }
        
        const response = await fetch(`${API}/plans/user/${currentUser.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        console.log('ðŸ“¥ Resposta apÃ³s confirmaÃ§Ã£o:', data);
        
        if (data.success) {
            if (method === 'pix') {
                showPixPayment(data.data);
                startPaymentStatusCheck(data.data.id);
                
                sessionStorage.setItem('pendingPayment', JSON.stringify({
                    paymentId: data.data.id,
                    planIds: selectedPlans,
                    timestamp: Date.now()
                }));
                
                // Mostrar mensagem sobre cancelamento de aulas
                showNotification('âš ï¸ Downgrade confirmado! Todas as suas aulas futuras serÃ£o canceladas apÃ³s o pagamento.', 'warning');
                
            } else if (method === 'boleto') {
                showBoletoPayment(data.data);
                startPaymentStatusCheck(data.data.id);
                
                sessionStorage.setItem('pendingPayment', JSON.stringify({
                    paymentId: data.data.id,
                    planIds: selectedPlans,
                    timestamp: Date.now()
                }));
                
            } else {
                if (data.data?.status === 'approved') {
                    showSuccessModal();
                } else {
                    startPaymentStatusCheck(data.data.id);
                    sessionStorage.setItem('pendingPayment', JSON.stringify({
                        paymentId: data.data.id,
                        planIds: selectedPlans,
                        timestamp: Date.now()
                    }));
                    showNotification('Pagamento com cartao enviado. Aguardando confirmacao.', 'info');
                }
            }
        } else {
            showError(data.error || 'Erro no processamento');
            button.disabled = false;
            button.innerHTML = originalText;
        }
        
    } catch (error) {
        console.error('âŒ Erro no pagamento:', error);
        showError('Erro de conexÃ£o com o servidor');
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
    
    // Verificar se estamos na aba correta
    const cardContent = document.getElementById('cardContent');
    if (!cardContent || !cardContent.classList.contains('active')) {
        // Se nÃ£o estiver na aba de cartÃ£o, ativar automaticamente
        switchTab('credit');

        // Pequeno delay para garantir que os elementos foram renderizados
        setTimeout(() => {
            if (validateCardData()) {
                processPayment('credit', button);
            }
        }, 100);
        return;
    }

    if (validateCardData()) {
        processPayment('credit', button);
    }
}

function processBoletoPayment() {
    const button = document.getElementById('boletoButton');
    if (button) processPayment('boleto', button);
}

// ============================================
// VALIDAR DADOS DO CARTÃƒO
// ============================================
function validateCardData() {
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');
    const cardName = document.getElementById('cardName');
    const cardCpf = document.getElementById('cardCpf');

    // Verificar se todos os elementos existem
    if (!cardNumber || !cardExpiry || !cardCvv || !cardName || !cardCpf) {
        console.error('Elementos do cartao nao encontrados');
        showError('Erro ao carregar formulario do cartao. Tente novamente.');
        return false;
    }

    const number = cardNumber.value.replace(/\s/g, '') || '';
    const expiry = cardExpiry.value || '';
    const cvv = cardCvv.value || '';
    const name = cardName.value.trim() || '';
    const cpf = cardCpf.value || '';

    // Validar numero do cartao
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 16) {
        showError('Numero do cartao invalido');
        cardNumber.focus();
        return false;
    }
    
    if (!expiry.match(/^\d{2}\/\d{2}$/)) {
        showError('Data de validade invalida (use MM/AA)');
        cardExpiry.focus();
        return false;
    }
    
    // Verificar se a data nao esta expirada
    const [monthStr, yearStr] = expiry.split('/');
    const month = parseInt(monthStr, 10);
    const year = 2000 + parseInt(yearStr, 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
        showError('Data de validade invalida (mes incorreto)');
        cardExpiry.focus();
        return false;
    }

    // Ultimo instante do mes de validade
    const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
    if (expiryDate < new Date()) {
        showError('Cartao expirado');
        cardExpiry.focus();
        return false;
    }

    const cleanCvv = cvv.replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        showError('CVV invalido (deve ter 3 ou 4 digitos)');
        cardCvv.focus();
        return false;
    }
    
    if (name.length < 3 || name.length > 50) {
        showError('Nome no cartao invalido');
        cardName.focus();
        return false;
    }
    
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
        showError('CPF invalido (deve ter 11 digitos)');
        cardCpf.focus();
        return false;
    }
    
    return true;
}

// ============================================
// INICIALIZAR CAMPOS DO CARTAO
// ============================================
function initCardFields() {
    console.log('Inicializando campos do cartao');

    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');
    const cardCpf = document.getElementById('cardCpf');

    if (cardNumber && !cardNumber.dataset.maskInit) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '').slice(0, 16);
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value;
        });
        cardNumber.dataset.maskInit = 'true';
    }

    if (cardExpiry && !cardExpiry.dataset.maskInit) {
        cardExpiry.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '').slice(0, 4);
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
        cardExpiry.dataset.maskInit = 'true';
    }

    if (cardCvv && !cardCvv.dataset.maskInit) {
        cardCvv.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
        cardCvv.dataset.maskInit = 'true';
    }

    if (cardCpf && !cardCpf.dataset.maskInit) {
        cardCpf.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '').slice(0, 11);
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            e.target.value = value;
        });
        cardCpf.dataset.maskInit = 'true';
    }
}

function extractCPF(cpf) {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    return clean.padEnd(11, '0').substring(0, 11);
}

// ============================================
// MONITORAR STATUS DO PAGAMENTO
// ============================================
function startPaymentStatusCheck(paymentId) {
    console.log(`ðŸ” Monitorando pagamento ID: ${paymentId}`);
    
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
                console.log(`ðŸ“Š Status do pagamento (tentativa ${attempts}):`, data.status);
                
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
                        pixButton.innerHTML = '<i class="fas fa-qrcode"></i> Gerar Codigo PIX';
                    }
                }
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                showNotification('O pagamento estÃ¡ sendo processado. VocÃª serÃ¡ redirecionado quando confirmado.', 'info');
                
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
    
    showNotification('Pagamento PIX gerado! Escaneie o codigo ou copie a chave.', 'success');
    
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
        waitingMsg.innerHTML = '<i class="fas fa-clock"></i> Aguardando confirmaçao do pagamento...';
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
    
    showNotification('CÃ³digo PIX copiado!', 'success');
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
        console.log('ðŸ”„ Atualizando dados do usuÃ¡rio apÃ³s pagamento...');
        
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
                console.log('âœ… Dados do usuÃ¡rio atualizados:', currentUser);
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
                    console.log('âœ… Dados atualizados via subscription/status');
                }
            }
        }
    } catch (error) {
        console.error('âŒ Erro ao atualizar dados apÃ³s pagamento:', error);
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
// SISTEMA DE NOTIFICAÃ‡Ã•ES
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
        .btn-remove-plan {
            transition: transform 0.3s ease !important;
        }
        .btn-remove-plan:hover {
            transform: scale(1.1) !important;
        }

        #btnAddMorePlans {
            transition: all 0.3s ease !important;
        }
        #btnAddMorePlans:hover {
            background: #6366f110 !important;
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
// EXPOR FUNÃ‡Ã•ES GLOBAIS
// ============================================
window.switchTab = switchTab;
window.processPixPayment = processPixPayment;
window.processCardPayment = processCardPayment;
window.processBoletoPayment = processBoletoPayment;
window.copyPixCode = copyPixCode;
window.redirectToAgenda = redirectToAgenda;
window.removePlan = removePlan;

console.log('âœ… checkout.js carregado com sucesso! (Modo Multiplanos com RemoÃ§Ã£o)');
const discountStyles = `
    .discount-badge {
        animation: slideIn 0.5s ease;
    }
    
    .economy-summary {
        animation: fadeIn 0.5s ease;
    }
    
    .plan-detail {
        transition: all 0.3s ease;
    }
    
    .plan-detail:hover {
        transform: translateX(5px);
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

// Adicione ao head
const style = document.createElement('style');
style.textContent = discountStyles;
document.head.appendChild(style);
