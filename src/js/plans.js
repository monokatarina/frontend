// plans.js
const API = 'https://jokesteronline.org/api';

const PLANS = {
    basic: {
        name: 'Básico',
        aulasPorSemana: 2,
        price: 1,
        features: ['2 aulas por semana', 'Acesso a todos horários', 'Suporte por email']
    },
    intermediate: {
        name: 'Intermediário',
        aulasPorSemana: 3,
        price: 1,
        features: ['3 aulas por semana', 'Acesso a todos horários', 'Suporte prioritário']
    },
    advanced: {
        name: 'Avançado',
        aulasPorSemana: 4,
        price: 1,
        features: ['4 aulas por semana', 'Acesso a todos horários', 'Suporte VIP']
    },
    premium: {
        name: 'Premium',
        aulasPorSemana: 5,
        price: 1,
        features: ['5 aulas por semana', 'Acesso a todos horários', 'Suporte 24/7']
    }
};

document.addEventListener('DOMContentLoaded', () => {
    renderPlans();
    setupEventListeners();
});

let selectedPlan = null;

function renderPlans() {
    const grid = document.getElementById('plansGrid');
    grid.innerHTML = '';

    Object.entries(PLANS).forEach(([id, plan]) => {
        const card = document.createElement('div');
        card.className = 'plan-card';
        card.dataset.plan = id;
        
        card.innerHTML = `
            <div class="badge">${plan.name}</div>
            <h3>${plan.name}</h3>
            <div class="price">R$ ${plan.price}<span>/mês</span></div>
            <div class="features">
                ${plan.features.map(f => `
                    <div class="feature">
                        <i class="fas fa-check"></i> ${f}
                    </div>
                `).join('')}
            </div>
            <button class="btn-select" style="background: #6366f1; color: white;">
                Escolher plano
            </button>
        `;

        card.addEventListener('click', () => selectPlan(id, card));
        grid.appendChild(card);
    });
}

function selectPlan(planId, card) {
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedPlan = planId;
    
    document.getElementById('plansGrid').style.display = 'none';
    document.getElementById('paymentForm').classList.add('active');
}

function setupEventListeners() {
    document.getElementById('backToPlans').addEventListener('click', () => {
        document.getElementById('plansGrid').style.display = 'grid';
        document.getElementById('paymentForm').classList.remove('active');
    });

    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedPlan) {
            alert('Selecione um plano');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('Faça login primeiro');
            window.location.href = 'index.html';
            return;
        }

        const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
        
        if (cpf.length !== 11) {
            alert('CPF inválido');
            return;
        }

        const submitBtn = document.getElementById('submitPayment');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

        try {
            const response = await fetch(`${API}/payments/subscription/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    planType: selectedPlan,
                    payerInfo: {
                        documentType: 'CPF',
                        documentNumber: cpf,
                        name: document.getElementById('fullName').value,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value
                    }
                })
            });

            const data = await response.json();

            if (data.success && data.data.initPoint) {
                alert('Redirecionando para o Mercado Pago...');
                window.location.href = data.data.initPoint;
            } else {
                alert('Erro: ' + (data.error || 'Falha ao criar assinatura'));
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao processar pagamento');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}