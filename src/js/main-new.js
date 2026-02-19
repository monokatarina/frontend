// ============================================
// FRONTEND - SISTEMA DE AGENDAMENTO
// VERSÃO COM VISUALIZAÇÃO SEMANAL MELHORADA
// ============================================

// ===== CONFIGURAÇÕES =====
const API = 'https://jokesteronline.org/api';
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19];

// ===== CONSTANTES DE REGRAS =====
const CANCEL_LIMIT_HOURS = 9;
const PROXIMITY_GRACE_MINUTES = 10;

// ===== PLANOS DE ASSINATURA =====
const PLANS = {
    basic: {
        id: 'basic',
        name: 'Básico',
        aulasPorSemana: 2,
        price: 1,
        color: '#10b981',
        icon: 'fa-seedling',
        features: ['2 aulas por semana', 'Acesso a todos horários', 'Suporte básico']
    },
    intermediate: {
        id: 'intermediate',
        name: 'Intermediário',
        aulasPorSemana: 3,
        price: 1,
        color: '#3b82f6',
        icon: 'fa-fire',
        features: ['3 aulas por semana', 'Acesso a todos horários', 'Suporte prioritário']
    },
    advanced: {
        id: 'advanced',
        name: 'Avançado',
        aulasPorSemana: 4,
        price: 1,
        color: '#f59e0b',
        icon: 'fa-rocket',
        features: ['4 aulas por semana', 'Acesso a todos horários', 'Suporte VIP']
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        aulasPorSemana: 5,
        price: 1,
        color: '#8b5cf6',
        icon: 'fa-crown',
        features: ['5 aulas por semana', 'Acesso a todos horários', 'Suporte 24/7']
    }
};

// ===== ESTADO GLOBAL =====
let availability = {};
let bookings = [];
let adminMode = false;
let currentUser = null;
let loading = false;
let processingReservation = false;
let showingPlans = false;
let nextDates = {};
let timerInterval = null;
let modalContext = null;

// ===== ELEMENTOS DOM =====
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const scheduleEl = document.getElementById('schedule');
const userInfo = document.getElementById('userInfo');
const weeklyWarning = document.getElementById('weeklyWarning');
const adminPanel = document.getElementById('adminPanel');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalUserName = document.getElementById('modalUserName');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const modalClose = document.getElementById('modalClose');
const toastContainer = document.getElementById('toastContainer');
const adminMenuBtn = document.getElementById('adminMenuBtn');
const adminDropdown = document.getElementById('adminDropdown');

// ============================================
// 1. FUNÇÕES UTILITÁRIAS BÁSICAS
// ============================================

// Sistema de notificações
function showNotification(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Carrega datas do backend
async function loadDates() {
    try {
        const response = await fetch(`${API}/admin/dates`);
        const data = await response.json();
        nextDates = data.data;
        console.log('📅 Datas carregadas:', nextDates);
        return nextDates;
    } catch (error) {
        console.error('❌ Erro ao carregar datas:', error);
        showNotification('Erro ao carregar calendário', 'error');
        return null;
    }
}

// Fetch API wrapper
const fetchAPI = async (endpoint, options = {}) => {
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    };

    try {
        const res = await fetch(`${API}${endpoint}`, { ...defaultOptions, ...options });
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || data.message || `Erro ${res.status}`);
        }
        
        return { success: true, data: data.data || data, status: res.status };
    } catch (err) {
        console.error(`❌ Fetch error (${endpoint}):`, err.message);
        return { success: false, error: err.message };
    }
};

// Formata data de YYYY-MM-DD para DD/MM/YYYY
const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

// Verifica se um horário está reservado
const isBooked = (dateStr, hour) => {
    return bookings.filter(b => 
        b.date === dateStr && 
        Number(b.hour) === Number(hour)
    );
};

// ============================================
// 2. FUNÇÕES DE CONTROLE DE PLANOS
// ============================================

// Verifica se usuário tem plano ativo
function userHasActivePlan() {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    
    console.log('🔍 Verificando plano do usuário:', currentUser);
    
    // Verificar plano direto
    if (currentUser.plan) {
        if (!currentUser.plan.status || currentUser.plan.status === 'active') {
            console.log('✅ Plano ativo encontrado:', currentUser.plan);
            return true;
        }
    }
    
    // Verificar assinatura
    if (currentUser.subscription && currentUser.subscription.status === 'active') {
        console.log('✅ Assinatura ativa encontrada:', currentUser.subscription);
        
        if (!currentUser.plan) {
            const planType = currentUser.subscription.planType || 'basic';
            currentUser.plan = {
                id: planType,
                name: getPlanName(planType),
                aulasPorSemana: currentUser.subscription.aulasPorSemana || getPlanAulas(planType),
                status: 'active',
                color: PLANS[planType]?.color || '#6366f1'
            };
        }
        return true;
    }
    
    console.log('❌ Nenhum plano ativo encontrado');
    return false;
}

// Verifica status da assinatura no backend
async function checkSubscriptionStatus() {
    if (!currentUser) return;

    try {
        console.log('🔍 Verificando status da assinatura para usuário:', currentUser.id);
        
        const response = await fetch(`${API}/payments/subscription/status/${currentUser.id}`);
        const data = await response.json();

        console.log('📊 Resposta do status:', data);

        if (data.success && data.data) {
            if (data.data.hasSubscription && data.data.plan) {
                currentUser.plan = data.data.plan;
                console.log('✅ Plan atualizado:', currentUser.plan);
            }
            
            if (data.data.subscription && data.data.subscription.status === 'active') {
                const sub = data.data.subscription;
                currentUser.subscription = sub;
                
                if (!currentUser.plan) {
                    currentUser.plan = {
                        id: sub.planType,
                        name: getPlanName(sub.planType),
                        aulasPorSemana: sub.aulasPorSemana || getPlanAulas(sub.planType),
                        status: 'active',
                        color: PLANS[sub.planType]?.color || '#6366f1'
                    };
                }
            }
            
            // Atualizar UI com informações do plano
            updatePlanInfo();
        }
    } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
    }
}

// Atualiza informações do plano na interface
function updatePlanInfo() {
    if (!currentUser) return;
    
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    let planHtml = '';
    
    if (currentUser.isAdmin) {
        planHtml = `
            <span class="plan-badge admin">
                <i class="fas fa-crown"></i>
                Administrador
            </span>
        `;
    } else if (userHasActivePlan() && currentUser.plan) {
        const planColor = currentUser.plan.color || '#6366f1';
        planHtml = `
            <span class="plan-badge" style="background: ${planColor}">
                <i class="fas ${PLANS[currentUser.plan.id]?.icon || 'fa-crown'}"></i>
                ${currentUser.plan.name || currentUser.plan.id}
                <span class="plan-aulas">${currentUser.plan.aulasPorSemana}/semana</span>
            </span>
        `;
    } else {
        planHtml = `
            <span class="plan-badge no-plan" onclick="window.location.href='/plans'">
                <i class="fas fa-exclamation-circle"></i>
                Sem plano ativo
                <button class="btn-plan-small">Escolher plano</button>
            </span>
        `;
    }
    
    // Adicionar badge do usuário
    const userBadge = `
        <span class="user-badge ${currentUser.isAdmin ? 'admin' : ''}">
            <i class="fas fa-${currentUser.isAdmin ? 'crown' : 'user'}"></i>
            ${currentUser.name || currentUser.email}
        </span>
    `;
    
    userInfo.innerHTML = userBadge + planHtml;
    
    // Atualizar aviso semanal com base no plano
    if (currentUser.plan) {
        updateWeeklyWarning();
    } else {
        updateWeeklyWarningNoPlan();
    }
}

// Funções auxiliares para planos
function getPlanName(planId) {
    return PLANS[planId]?.name || 'Básico';
}

function getPlanAulas(planId) {
    return PLANS[planId]?.aulasPorSemana || 2;
}

// ============================================
// 3. FUNÇÕES DE AVISO SEMANAL MELHORADAS
// ============================================

// Função para obter o range da semana de uma data
function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = domingo, 1 = segunda, ...
    
    // Ajustar para segunda como primeiro dia da semana
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { monday, sunday };
}

// Função para formatar range da semana
function formatWeekRange(date) {
    const { monday, sunday } = getWeekRange(date);
    
    const formatDayMonth = (d) => {
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };
    
    return `${formatDayMonth(monday)} a ${formatDayMonth(sunday)}`;
}

// Função para agrupar reservas por semana
function groupBookingsByWeek(bookings) {
    const grouped = {};
    
    bookings.forEach(booking => {
        const bookingDate = new Date(booking.date + 'T00:00:00');
        const { monday } = getWeekRange(bookingDate);
        const weekKey = monday.toISOString().split('T')[0];
        
        if (!grouped[weekKey]) {
            grouped[weekKey] = {
                weekStart: monday,
                weekKey: weekKey,
                bookings: []
            };
        }
        
        grouped[weekKey].bookings.push(booking);
    });
    
    // Ordenar semanas da mais recente para a mais antiga
    return Object.values(grouped).sort((a, b) => b.weekStart - a.weekStart);
}

// Função para contar reservas em uma semana específica
function countBookingsInWeek(weekStart, userId) {
    const { monday, sunday } = getWeekRange(weekStart);
    
    return bookings.filter(b => {
        if (b.userId !== userId) return false;
        const bookDate = new Date(b.date + 'T00:00:00');
        return bookDate >= monday && bookDate <= sunday;
    }).length;
}

function updateWeeklyWarning() {
    if (!weeklyWarning) return;
    
    if (currentUser?.isAdmin) {
        weeklyWarning.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-crown"></i>
                <span>Modo Administrador - Você tem acesso total</span>
            </div>
        `;
        weeklyWarning.className = 'weekly-warning admin';
        return;
    }
    
    if (!currentUser?.plan || !userHasActivePlan()) {
        updateWeeklyWarningNoPlan();
        return;
    }
    
    const planName = currentUser.plan.name || currentUser.plan.id;
    const planLimit = currentUser.plan.aulasPorSemana;
    const weekRange = formatWeekRange(new Date());
    
    // Calcular quantas reservas o usuário tem na semana atual
    const currentWeekCount = countBookingsInWeek(new Date(), currentUser.id);
    const remaining = planLimit - currentWeekCount;
    
    let statusClass = 'info';
    let statusIcon = 'fa-chart-line';
    let statusMessage = '';
    
    if (currentWeekCount >= planLimit) {
        statusClass = 'warning';
        statusIcon = 'fa-exclamation-triangle';
        statusMessage = '<span class="limit-reached">Limite semanal atingido!</span>';
    } else {
        statusMessage = `<span class="remaining">${remaining} vaga${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}</span>`;
    }
    
    weeklyWarning.innerHTML = `
        <div class="warning-content">
            <div class="warning-left">
                <i class="fas ${statusIcon}"></i>
                <div class="warning-text">
                    <span class="plan-indicator" style="background: ${currentUser.plan.color || '#6366f1'}">
                        <i class="fas ${PLANS[currentUser.plan.id]?.icon || 'fa-crown'}"></i>
                        Plano ${planName}
                    </span>
                    <span class="week-info">
                        <i class="fas fa-calendar-week"></i>
                        Semana de ${weekRange}
                    </span>
                </div>
            </div>
            <div class="warning-right">
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${(currentWeekCount/planLimit)*100}%; background: ${currentUser.plan.color || '#6366f1'}"></div>
                </div>
                <div class="counter-info">
                    <span class="current-count"><strong>${currentWeekCount}</strong>/${planLimit} aulas</span>
                    ${statusMessage}
                </div>
            </div>
        </div>
    `;
    
    weeklyWarning.className = `weekly-warning ${statusClass}`;
}

function updateWeeklyWarningNoPlan() {
    if (!weeklyWarning) return;
    
    weeklyWarning.innerHTML = `
        <div class="warning-content">
            <i class="fas fa-info-circle"></i>
            <span>Você não possui um plano ativo.</span>
            <a href="/plans" class="warning-link" style="background: var(--primary);">
                <i class="fas fa-crown"></i>
                Escolher plano
            </a>
        </div>
    `;
    weeklyWarning.className = 'weekly-warning warning';
}

// ============================================
// 4. FUNÇÕES DE CONTAGEM E VALIDAÇÃO
// ============================================

// Conta reservas do usuário na semana atual (para compatibilidade)
const getWeeklyBookingsCount = () => {
    if (!currentUser) return 0;
    return countBookingsInWeek(new Date(), currentUser.id);
};

// Valida se pode cancelar uma reserva
function canCancelBooking(booking) {
    if (!booking) return { canCancel: false, reason: 'Reserva não encontrada' };
    
    const now = new Date();
    const bookingDate = new Date(`${booking.date}T${String(booking.hour).padStart(2, '0')}:00:00`);
    
    const diffMs = bookingDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);
    
    if (diffHours > CANCEL_LIMIT_HOURS) {
        return { 
            canCancel: true, 
            reason: 'ok',
            diffHours: Math.floor(diffHours),
            diffMinutes: Math.floor(diffMinutes % 60)
        };
    }
    
    if (diffHours <= CANCEL_LIMIT_HOURS) {
        if (booking.createdAt) {
            const createdDate = new Date(booking.createdAt);
            const minutesSinceCreation = (now - createdDate) / (1000 * 60);
            
            if (minutesSinceCreation <= PROXIMITY_GRACE_MINUTES) {
                return { 
                    canCancel: true, 
                    reason: 'grace_period',
                    minutesLeft: Math.floor(PROXIMITY_GRACE_MINUTES - minutesSinceCreation),
                    diffHours: Math.floor(diffHours),
                    diffMinutes: Math.floor(diffMinutes % 60)
                };
            }
        }
        
        const hoursUntil = Math.floor(diffHours);
        const minutesUntil = Math.floor(diffMinutes % 60);
        
        let timeMessage = '';
        if (hoursUntil > 0) {
            timeMessage = `${hoursUntil} hora${hoursUntil > 1 ? 's' : ''}`;
            if (minutesUntil > 0) {
                timeMessage += ` e ${minutesUntil} minuto${minutesUntil > 1 ? 's' : ''}`;
            }
        } else {
            timeMessage = `${minutesUntil} minuto${minutesUntil > 1 ? 's' : ''}`;
        }
        
        return { 
            canCancel: false, 
            reason: 'too_late',
            timeMessage,
            diffHours,
            diffMinutes
        };
    }
    
    return { canCancel: false, reason: 'unknown' };
}

// Mensagem de cancelamento
function getCancellationMessage(cancelCheck) {
    if (!cancelCheck) return 'Não é possível cancelar esta reserva';
    
    switch (cancelCheck.reason) {
        case 'ok':
            return `✅ Você pode cancelar esta reserva. Faltam ${cancelCheck.diffHours}h ${cancelCheck.diffMinutes}min para a aula.`;
        
        case 'grace_period':
            return `⏰ Período de graça: você tem ${cancelCheck.minutesLeft} minutos para cancelar esta reserva (aula em menos de ${CANCEL_LIMIT_HOURS}h).`;
        
        case 'too_late':
            return `❌ Cancelamento não permitido. Aula começa em ${cancelCheck.timeMessage}.`;
        
        default:
            return 'Não é possível cancelar esta reserva';
    }
}

// Valida horário da reserva
function validateBookingTime(date, hour) {
    const now = new Date();
    const bookingDate = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
    
    if (bookingDate - now < CANCEL_LIMIT_HOURS * 60 * 60 * 1000) {
        return {
            valid: true,
            warning: `⏰ Aula em menos de ${CANCEL_LIMIT_HOURS}h. Você terá apenas ${PROXIMITY_GRACE_MINUTES} minutos para cancelar.`
        };
    }
    
    return { valid: true };
}

// ============================================
// 5. FUNÇÕES DE CRONÔMETRO
// ============================================

function formatTimeRemaining(bookingDate) {
    const now = new Date();
    const diffMs = bookingDate - now;
    
    if (diffMs <= 0) {
        return { text: 'Aula já passou', class: 'expired', expired: true };
    }
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMinutes % 60;
    
    let timeText = '';
    let timeClass = '';
    
    if (diffDays > 0) {
        timeText = `${diffDays}d ${remainingHours}h`;
        timeClass = 'days';
    } else if (diffHours > 0) {
        timeText = `${diffHours}h ${remainingMinutes}min`;
        timeClass = 'hours';
    } else if (diffMinutes > 0) {
        timeText = `${diffMinutes}min`;
        timeClass = 'minutes';
    } else {
        timeText = `${diffSeconds}s`;
        timeClass = 'seconds';
    }
    
    let urgencyClass = 'safe';
    if (diffHours < 1) {
        urgencyClass = 'critical';
    } else if (diffHours < 6) {
        urgencyClass = 'warning';
    } else if (diffHours < 24) {
        urgencyClass = 'moderate';
    }
    
    return {
        text: timeText,
        class: `${timeClass} ${urgencyClass}`,
        full: `${timeText} restantes`,
        expired: false
    };
}

function startTimers() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        updateAllTimers();
    }, 1000);
}

function updateAllTimers() {
    const timerElements = document.querySelectorAll('.booking-timer');
    timerElements.forEach(element => {
        const datetime = element.dataset.datetime;
        if (datetime) {
            const bookingDate = new Date(datetime);
            const timeRemaining = formatTimeRemaining(bookingDate);
            
            if (timeRemaining.expired) {
                element.innerHTML = `<i class="fas fa-hourglass-end"></i> <span class="expired">Aula passou</span>`;
                element.classList.add('expired');
            } else {
                element.innerHTML = `<i class="fas fa-hourglass-half"></i> <span class="${timeRemaining.class}">${timeRemaining.text}</span>`;
                element.className = 'booking-timer';
                element.classList.add(...timeRemaining.class.split(' '));
            }
        }
    });
}

// ============================================
// 6. FUNÇÕES DE RENDERIZAÇÃO
// ============================================

function createHeaderCell(className, content) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = content;
    return div;
}

function createHourLabel(hour) {
    const div = document.createElement('div');
    div.className = 'hour-label';
    div.innerHTML = `<span>${hour}:00</span>`;
    return div;
}

function createSlot(wd, h) {
    const slot = document.createElement('button');
    slot.className = 'slot-btn';
    
    const dateStr = nextDates[wd];
    
    if (!dateStr) {
        slot.classList.add('disabled');
        slot.innerHTML = '<i class="fas fa-ban"></i>';
        return slot;
    }
    
    const bookedList = isBooked(dateStr, h);
    const bookCount = bookedList.length;
    const isAvailable = availability[wd]?.[h] || false;
    const isFull = bookCount >= 4;
    const userHasBooking = bookedList.some(b => b.userId === currentUser?.id);
    const hasActivePlan = userHasActivePlan() || currentUser?.isAdmin;
    
    if (!isAvailable) {
        slot.classList.add('disabled');
        slot.innerHTML = '<i class="fas fa-ban"></i>';
    } else if (isFull) {
        slot.classList.add('full');
        slot.innerHTML = `<span class="count">${bookCount}/4</span><span class="label"> Lotado</span>`;
        slot.disabled = true;
    } else if (bookCount > 0) {
        slot.classList.add('partial');
        slot.innerHTML = `<span class="count">${bookCount}/4</span><span class="label"> vagas</span>`;
        if (!hasActivePlan) {
            slot.disabled = true;
            slot.classList.add('requires-plan');
            slot.title = 'Você precisa de um plano para agendar';
        }
    } else {
        slot.classList.add('available');
        slot.innerHTML = `<span class="count">0/4</span><span class="label"> Disponível</span>`;
        if (!hasActivePlan) {
            slot.disabled = true;
            slot.classList.add('requires-plan');
            slot.title = 'Você precisa de um plano para agendar';
        }
    }
    
    if (userHasBooking) {
        slot.classList.add('my-booking');
    }

    slot.dataset.weekday = wd;
    slot.dataset.hour = h;
    slot.dataset.date = dateStr;
    slot.dataset.available = isAvailable;
    slot.dataset.bookCount = bookCount;

    slot.addEventListener('click', onSlotClick);
    
    return slot;
}

function renderSchedule() {
    const grid = document.createElement('div');
    grid.className = 'grid';

    grid.appendChild(createHeaderCell('hour-header', '<i class="fas fa-clock"></i> Horário'));
    
    for (let i = 0; i < 5; i++) {
        grid.appendChild(createHeaderCell('weekday-header', weekdays[i]));
    }

    for (const h of HOURS) {
        grid.appendChild(createHourLabel(h));
        
        for (let wd = 1; wd <= 5; wd++) {
            const slot = createSlot(wd, h);
            grid.appendChild(slot);
        }
    }

    scheduleEl.style.opacity = '0';
    setTimeout(() => {
        scheduleEl.innerHTML = '';
        scheduleEl.appendChild(grid);
        scheduleEl.style.opacity = '1';
    }, 200);

    updateWeeklyWarning();
}

// ============================================
// 7. RENDERIZAÇÃO DE RESERVAS POR SEMANA
// ============================================

function renderMyBookings() {
    const el = document.getElementById('myBookingsList');
    if (!el) return;
    
    el.innerHTML = '';
    
    if (!currentUser) {
        el.innerHTML = '<p class="empty-message"><i class="fas fa-lock"></i> Faça login para ver suas reservas</p>';
        return;
    }

    const myBookings = bookings.filter(b => b.userId === currentUser.id);
    
    if (myBookings.length === 0) {
        el.innerHTML = '<p class="empty-message"><i class="fas fa-calendar-times"></i> Você não possui reservas</p>';
        return;
    }

    // Agrupar reservas por semana
    const groupedByWeek = groupBookingsByWeek(myBookings);
    
    groupedByWeek.forEach(weekGroup => {
        const weekStart = weekGroup.weekStart;
        const weekBookings = weekGroup.bookings.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calcular quantas reservas nesta semana
        const weekCount = weekBookings.length;
        const planLimit = currentUser.plan?.aulasPorSemana || 5;
        
        // Criar header da semana
        const weekHeader = document.createElement('div');
        weekHeader.className = 'week-header';
        
        const isCurrentWeek = getWeekRange(new Date()).monday.toISOString().split('T')[0] === weekGroup.weekKey;
        
        weekHeader.innerHTML = `
            <div class="week-title">
                <i class="fas fa-calendar-alt"></i>
                <span>Semana de ${formatWeekRange(weekStart)}</span>
                ${isCurrentWeek ? '<span class="current-week-badge">Semana atual</span>' : ''}
            </div>
            <div class="week-stats">
                <div class="week-progress">
                    <div class="progress-bar-small" style="width: ${(weekCount/planLimit)*100}%; background: ${currentUser.plan?.color || '#6366f1'}"></div>
                </div>
                <span class="week-count"><strong>${weekCount}</strong>/${planLimit} aulas</span>
            </div>
        `;
        
        el.appendChild(weekHeader);
        
        // Renderizar cada reserva da semana
        weekBookings.forEach(booking => {
            const item = createBookingItem(booking);
            el.appendChild(item);
        });
    });
    
    startTimers();
}

function createBookingItem(booking) {
    const item = document.createElement('div');
    item.className = 'my-booking-item';
    
    const bookingDateTime = new Date(`${booking.date}T${String(booking.hour).padStart(2, '0')}:00:00`);
    const datetimeStr = bookingDateTime.toISOString();
    
    const cancelCheck = canCancelBooking(booking);
    const canCancel = cancelCheck.canCancel;
    const formattedDate = formatDate(booking.date);
    const timeRemaining = formatTimeRemaining(bookingDateTime);
    const weekRange = formatWeekRange(bookingDateTime);
    
    // Determinar se é semana atual
    const isCurrentWeek = getWeekRange(new Date()).monday.toISOString().split('T')[0] === 
                          getWeekRange(bookingDateTime).monday.toISOString().split('T')[0];
    
    item.innerHTML = `
        <div class="booking-info">
            <div class="booking-main">
                <div class="booking-datetime">
                    <i class="fas fa-calendar-day"></i>
                    <span class="booking-date">${formattedDate}</span>
                    <span class="booking-hour">${booking.hour}:00</span>
                </div>
                <div class="booking-week">
                    <i class="fas fa-calendar-week"></i>
                    <span>${weekRange}</span>
                    ${isCurrentWeek ? '<span class="current-week-tag">Atual</span>' : ''}
                </div>
            </div>
            <div class="booking-timer" data-datetime="${datetimeStr}">
                <i class="fas fa-hourglass-half"></i>
                <span class="${timeRemaining.class}">${timeRemaining.text}</span>
            </div>
            <div class="booking-footer">
                ${!canCancel ? '<span class="cannot-cancel-badge"><i class="fas fa-lock"></i> Não pode cancelar</span>' : ''}
            </div>
        </div>
        <button class="btn-cancel" data-id="${booking.id}" ${!canCancel ? 'disabled' : ''}>
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
        </button>
    `;
    
    const cancelBtn = item.querySelector('.btn-cancel');
    cancelBtn.addEventListener('click', () => cancelBooking(booking.id));
    
    return item;
}

function renderDayControls() {
    const el = document.getElementById('dayControls');
    if (!el) return;
    
    el.innerHTML = '';
    
    for (let wd = 1; wd <= 5; wd++) {
        const btn = document.createElement('button');
        btn.className = 'day-control-btn';
        
        const dayName = weekdays[wd - 1];
        const slots = availability[wd] || {};
        const anyEnabled = Object.values(slots).some(Boolean);
        
        btn.innerHTML = `
            <i class="fas fa-${anyEnabled ? 'check-circle' : 'times-circle'}"></i>
            ${dayName}
            <span class="status">${anyEnabled ? 'Ativo' : 'Inativo'}</span>
        `;
        btn.classList.toggle('active', anyEnabled);
        
        btn.addEventListener('click', async () => {
            if (!currentUser?.isAdmin) {
                showNotification('Apenas administradores podem alterar disponibilidade', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            
            const result = await fetchAPI('/admin/availability/day', {
                method: 'POST',
                body: JSON.stringify({ weekday: wd, enabled: !anyEnabled })
            });
            
            if (result.success) {
                showNotification(`Disponibilidade de ${dayName} atualizada!`, 'success');
                await loadData();
            } else {
                showNotification(`Erro: ${result.error}`, 'error');
                btn.disabled = false;
                btn.innerHTML = `
                    <i class="fas fa-${anyEnabled ? 'check-circle' : 'times-circle'}"></i>
                    ${dayName}
                    <span class="status">${anyEnabled ? 'Ativo' : 'Inativo'}</span>
                `;
            }
        });
        
        el.appendChild(btn);
    }
}

// ============================================
// 8. FUNÇÕES DE AÇÃO
// ============================================

async function cancelBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    const cancelCheck = canCancelBooking(booking);
    
    if (!cancelCheck.canCancel) {
        const message = getCancellationMessage(cancelCheck);
        showNotification(message, 'error');
        return;
    }
    
    let confirmMessage = '⚠️ Deseja realmente cancelar esta reserva?';
    
    if (cancelCheck.reason === 'grace_period') {
        confirmMessage = `⚠️ Aula em menos de ${CANCEL_LIMIT_HOURS}h! Você tem apenas ${cancelCheck.minutesLeft} minutos para cancelar. Deseja cancelar agora?`;
    } else {
        confirmMessage = `⚠️ Cancelar reserva para ${formatDate(booking.date)} às ${booking.hour}:00?`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    const result = await fetchAPI(`/bookings/${id}?userId=${currentUser.id}`, {
        method: 'DELETE'
    });
    
    if (result.success) {
        showNotification('Reserva cancelada com sucesso!', 'success');
        await loadData();
    } else {
        showNotification(`Erro ao cancelar: ${result.error}`, 'error');
    }
}

function onSlotClick(e) {
    const btn = e.currentTarget;
    const wd = Number(btn.dataset.weekday);
    const h = Number(btn.dataset.hour);
    const date = btn.dataset.date;
    const isAvailable = btn.dataset.available === 'true';
    const bookCount = Number(btn.dataset.bookCount);

    // Modo Admin - toggle disponibilidade
    if (adminMode && currentUser?.isAdmin) {
        const newState = !isAvailable;
        if (!confirm(`${newState ? '✅ Ativar' : '❌ Desativar'} horário ${h}:00 de ${weekdays[wd - 1]}?`)) return;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        fetchAPI('/admin/availability/toggle', {
            method: 'POST',
            body: JSON.stringify({ weekday: wd, hour: h, enabled: newState })
        }).then(() => {
            showNotification(`Horário ${newState ? 'ativado' : 'desativado'}!`, 'success');
            loadData();
        }).catch(() => {
            btn.disabled = false;
            showNotification('Erro ao alterar disponibilidade', 'error');
        });
        return;
    }
    
    // Verificar login
    if (!currentUser) {
        showNotification('Faça login para reservar um horário', 'error');
        showAuthScreen();
        return;
    }

    // VERIFICAÇÃO PRINCIPAL: Usuário tem plano ativo?
    if (!currentUser.isAdmin && !userHasActivePlan()) {
        showNotification('Você precisa escolher um plano primeiro', 'warning');
        showPlanRequiredModal();
        return;
    }

    // Verificar disponibilidade
    if (!isAvailable) {
        showNotification('Este horário está indisponível', 'error');
        return;
    }

    // Verificar se já reservou
    const bookedList = isBooked(date, h);
    if (bookedList.some(b => b.userId === currentUser.id)) {
        showNotification('Você já reservou este horário', 'warning');
        return;
    }
    
    // Verificar lotação
    if (bookCount >= 4) {
        showNotification('Este horário já está lotado!', 'error');
        return;
    }
    
    // Verificar limite semanal
    const limite = currentUser.plan?.aulasPorSemana || 0;
    if (getWeeklyBookingsCount() >= limite) {
        showNotification(`Seu plano permite apenas ${limite} aulas por semana`, 'warning');
        return;
    }

    openBookingModal(date, h);
}

// Modal para redirecionar para planos
function showPlanRequiredModal() {
    let modal = document.getElementById('planRequiredModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'planRequiredModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div class="modal-header">
                    <h3><i class="fas fa-crown" style="color: #f59e0b;"></i> Plano necessário</h3>
                    <button class="modal-close" onclick="closePlanModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <i class="fas fa-lock" style="font-size: 48px; color: #f59e0b; margin: 20px 0;"></i>
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Para realizar agendamentos, você precisa escolher um plano.
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <p style="color: #666; margin-bottom: 10px;">Benefícios dos planos:</p>
                        <ul style="list-style: none; padding: 0; text-align: left;">
                            <li style="margin: 8px 0;">✓ Acesso a todos horários</li>
                            <li style="margin: 8px 0;">✓ Até 5 aulas por semana</li>
                            <li style="margin: 8px 0;">✓ Suporte personalizado</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-actions" style="flex-direction: column;">
                    <button class="btn-primary" onclick="redirectToPlans()" style="width: 100%;">
                        <i class="fas fa-crown"></i>
                        Ver planos disponíveis
                    </button>
                    <button class="btn-secondary" onclick="closePlanModal()" style="width: 100%;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

// Funções globais para o modal
window.closePlanModal = function() {
    const modal = document.getElementById('planRequiredModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

window.redirectToPlans = function() {
    closePlanModal();
    window.location.href = '/plans';
};

// ============================================
// 9. FUNÇÕES DE MODAL DE RESERVA
// ============================================

function openBookingModal(date, h) {
    modalContext = { date, hour: h };
    
    const bookedList = isBooked(date, h);
    const bookCount = bookedList.length;
    const availableSpots = 4 - bookCount;
    const weeklyCount = getWeeklyBookingsCount();
    const weekRange = formatWeekRange(new Date(date));
    
    const timeValidation = validateBookingTime(date, h);
    
    modalTitle.innerHTML = `
        <i class="fas fa-calendar-check"></i>
        Reservar ${formatDate(date)} — ${h}:00
    `;
    
    const warningHtml = timeValidation.warning ? 
        `<div class="booking-warning">
            <i class="fas fa-exclamation-triangle"></i>
            ${timeValidation.warning}
        </div>` : '';
    
    modalUserName.innerHTML = `
        <div class="user-info-detail">
            <p><i class="fas fa-user"></i> <strong>${currentUser.name}</strong></p>
            <p><i class="fas fa-crown" style="color: ${currentUser.plan?.color || '#6366f1'}"></i> 
                <strong>Plano ${currentUser.plan?.name || 'Ativo'}</strong> (${currentUser.plan?.aulasPorSemana || 0}/semana)
            </p>
            <p><i class="fas fa-calendar-week"></i> <strong>Semana de ${weekRange}</strong></p>
            <p class="${availableSpots > 0 ? 'text-success' : 'text-danger'}">
                <i class="fas fa-users"></i> Vagas disponíveis: ${availableSpots}/4
            </p>
            <p>
                <i class="fas fa-chart-line"></i> Seus agendamentos nesta semana: ${weeklyCount}/${currentUser.plan?.aulasPorSemana || 0}
            </p>
            ${warningHtml}
        </div>
    `;
    
    modalConfirm.disabled = false;
    modalConfirm.innerHTML = 'Confirmar';
    
    modal.hidden = false;
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.hidden = true;
        modalContext = null;
        modalConfirm.disabled = false;
        modalConfirm.innerHTML = 'Confirmar';
    }, 300);
}

// ============================================
// 10. FUNÇÕES DE PLANOS (REDIRECIONAMENTO)
// ============================================

function showPlans() {
    window.location.href = '/plans';
}

async function selectPlan(planId) {
    if (!currentUser) {
        showNotification('Faça login primeiro', 'warning');
        showAuthScreen();
        return;
    }

    const selectedPlanData = {
        id: planId,
        name: PLANS[planId].name,
        aulasPorSemana: PLANS[planId].aulasPorSemana,
        price: PLANS[planId].price
    };
    
    sessionStorage.setItem('selectedPlan', JSON.stringify(selectedPlanData));
    window.location.href = '/checkout';
}

// ============================================
// 11. CONTROLE DE TELAS
// ============================================

function showAuthScreen() {
    authScreen.style.display = 'flex';
    appScreen.classList.remove('active');
    if (modal) modal.hidden = true;
}

function showAppScreen() {
    authScreen.style.display = 'none';
    appScreen.classList.add('active');
    if (modal) modal.hidden = true;
    loadData();
}

// ============================================
// 12. CARREGAR DADOS
// ============================================

async function loadData() {
    if (loading) return;
    loading = true;
    
    try {
        scheduleEl.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
        
        await loadDates();
        
        const [availabilityRes, bookingsRes] = await Promise.all([
            fetchAPI('/admin/availability'),
            fetchAPI('/bookings')
        ]);
        
        if (!availabilityRes.success) throw new Error(availabilityRes.error);
        if (!bookingsRes.success) throw new Error(bookingsRes.error);
        
        availability = availabilityRes.data;
        bookings = bookingsRes.data;
        
        await checkSubscriptionStatus();
        
        // Renderizar interface
        renderSchedule();
        renderDayControls();
        renderMyBookings();
        startTimers();
        
        // Mostrar/esconder painel admin
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = currentUser?.isAdmin && adminMode ? '' : 'none';
        }
        
    } catch (e) {
        console.error('❌ Erro ao carregar dados:', e);
        showNotification('Erro ao carregar dados', 'error');
    } finally {
        loading = false;
    }
}

// ============================================
// 13. INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema iniciado - Versão com Visualização Semanal');
    
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabCadastro = document.getElementById('tabCadastro');
    const adminToggle = document.getElementById('adminMode');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // ===== TABS DE AUTENTICAÇÃO =====
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabCadastro.classList.remove('active');
        loginForm.classList.add('active');
        cadastroForm.classList.remove('active');
    });
    
    tabCadastro.addEventListener('click', () => {
        tabCadastro.classList.add('active');
        tabLogin.classList.remove('active');
        cadastroForm.classList.add('active');
        loginForm.classList.remove('active');
    });
    
    // ===== LOGIN =====
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showNotification('Preencha todos os campos', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        
        try {
            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser = data.user || data.data || data;
                
                await checkSubscriptionStatus();
                
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                showAppScreen();
                showNotification(`Bem-vindo, ${currentUser.name}!`, 'success');
            } else {
                showNotification(data.error || 'Falha no login', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            showNotification('Erro de conexão', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
    
    // ===== CADASTRO =====
    cadastroForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('cadastroName').value;
        const email = document.getElementById('cadastroEmail').value;
        const phone = document.getElementById('cadastroPhone').value;
        const password = document.getElementById('cadastroPassword').value;
        const password2 = document.getElementById('cadastroPassword2').value;
        
        if (password !== password2) {
            showNotification('As senhas não conferem', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        
        try {
            const response = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password, password2 }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showNotification('Cadastro realizado! Faça login.', 'success');
                tabLogin.click();
                
                ['cadastroName', 'cadastroEmail', 'cadastroPhone', 'cadastroPassword', 'cadastroPassword2']
                    .forEach(id => document.getElementById(id).value = '');
                
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            } else {
                showNotification(data.error || 'Falha no cadastro', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            showNotification('Erro de conexão', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
    
    // ===== LOGOUT =====
    logoutBtn.addEventListener('click', async () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
        currentUser = null;
        localStorage.removeItem('user');
        showAuthScreen();
        showNotification('Logout realizado', 'info');
    });
    
    // ===== MODO ADMIN =====
    adminToggle.addEventListener('change', (e) => {
        if (!currentUser?.isAdmin) {
            showNotification('Apenas administradores podem acessar o modo admin', 'error');
            e.target.checked = false;
            return;
        }
        
        adminMode = e.target.checked;
        adminPanel.hidden = !adminMode;
        
        document.querySelectorAll('.slot-btn').forEach(btn => {
            btn.classList.toggle('admin-mode', adminMode);
        });
        
        showNotification(adminMode ? 'Modo admin ativado' : 'Modo admin desativado', 'info');
    });
    
    // ===== BOTÃO ATUALIZAR =====
    refreshBtn.addEventListener('click', () => {
        loadData();
        showNotification('Dados atualizados', 'success');
    });
    
    // ===== MODAL DE RESERVA =====
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modalClose?.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    
    modalConfirm.addEventListener('click', async () => {
        if (processingReservation) return;
        
        if (!modalContext) {
            closeModal();
            return;
        }
        
        if (!currentUser) {
            closeModal();
            showNotification('Usuário não autenticado', 'error');
            return;
        }
        
        processingReservation = true;
        modalConfirm.disabled = true;
        modalConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirmando...';
        
        try {
            const result = await fetchAPI('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    date: modalContext.date,
                    hour: modalContext.hour,
                    name: currentUser.name,
                    userId: currentUser.id
                })
            });
            
            if (result.success) {
                showNotification('Horário reservado com sucesso!', 'success');
                closeModal();
                await loadData();
            } else {
                showNotification(`Erro ao reservar: ${result.error}`, 'error');
                modalConfirm.disabled = false;
                modalConfirm.innerHTML = 'Confirmar';
            }
        } catch (error) {
            showNotification('Erro ao processar reserva', 'error');
            modalConfirm.disabled = false;
            modalConfirm.innerHTML = 'Confirmar';
        } finally {
            processingReservation = false;
        }
    });
    
    // ===== MENU ADMIN DROPDOWN =====
    if (adminMenuBtn) {
        adminMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUser?.isAdmin) {
                adminDropdown.hidden = !adminDropdown.hidden;
            } else {
                showNotification('Apenas administradores', 'error');
            }
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.admin-menu')) {
            if (adminDropdown) adminDropdown.hidden = true;
        }
    });
    
    // ===== VERIFICAR USUÁRIO SALVO =====
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showAppScreen();
        } catch (err) {
            console.error('Erro ao recuperar usuário');
            localStorage.removeItem('user');
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }
});

// ============================================
// 14. ESTILOS ADICIONAIS MELHORADOS
// ============================================

const additionalStyles = `
    /* Estilos para informações do plano */
    .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .plan-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 30px;
        font-size: 13px;
        font-weight: 600;
        color: white;
        position: relative;
    }
    
    .plan-badge.no-plan {
        background: #f59e0b;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .plan-badge.no-plan:hover {
        background: #d97706;
        transform: translateY(-2px);
    }
    
    .plan-badge .btn-plan-small {
        background: white;
        color: #f59e0b;
        border: none;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        margin-left: 8px;
        cursor: pointer;
    }
    
    .plan-badge .plan-aulas {
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 10px;
        margin-left: 8px;
    }
    
    .plan-badge.admin {
        background: #8b5cf6;
    }
    
    /* Estilos para slots que requerem plano */
    .slot-btn.requires-plan {
        opacity: 0.6;
        cursor: not-allowed;
        position: relative;
        filter: grayscale(0.5);
    }
    
    .slot-btn.requires-plan:hover::after {
        content: "🔒 Necessário plano";
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        z-index: 10;
    }
    
    /* ===== AVISO SEMANAL MELHORADO ===== */
    .weekly-warning {
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transition: all 0.3s;
    }
    
    .weekly-warning.warning {
        border-left: 4px solid #f59e0b;
        background: #fff3cd;
    }
    
    .weekly-warning.info {
        border-left: 4px solid #3b82f6;
        background: #dbeafe;
    }
    
    .weekly-warning.admin {
        border-left: 4px solid #8b5cf6;
        background: #ede9fe;
    }
    
    .warning-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
    }
    
    .warning-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .warning-left i {
        font-size: 24px;
    }
    
    .warning-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .plan-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        width: fit-content;
    }
    
    .week-info {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #4b5563;
    }
    
    .warning-right {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
    }
    
    .progress-container {
        width: 200px;
        height: 8px;
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .progress-bar {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .counter-info {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
    }
    
    .current-count {
        font-weight: 600;
        color: #1f2937;
    }
    
    .remaining {
        color: #059669;
        font-weight: 600;
        background: rgba(5,150,105,0.1);
        padding: 4px 8px;
        border-radius: 20px;
    }
    
    .limit-reached {
        color: #dc2626;
        font-weight: 600;
        background: rgba(220,38,38,0.1);
        padding: 4px 8px;
        border-radius: 20px;
    }
    
    .warning-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 30px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .warning-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    /* ===== RESERVAS POR SEMANA ===== */
    .week-header {
        background: #f8fafc;
        padding: 12px 16px;
        margin: 16px 0 8px 0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        border: 1px solid #e2e8f0;
    }
    
    .week-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #1e293b;
    }
    
    .current-week-badge {
        background: #3b82f6;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    
    .week-stats {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    
    .progress-bar-small {
        height: 6px;
        width: 100px;
        background: #e2e8f0;
        border-radius: 3px;
        overflow: hidden;
    }
    
    .progress-bar-small div {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .week-count {
        font-size: 13px;
        font-weight: 500;
        color: #475569;
    }
    
    .my-booking-item {
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s;
    }
    
    .my-booking-item:hover {
        border-color: #94a3b8;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .booking-main {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .booking-datetime {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
    }
    
    .booking-date {
        font-weight: 600;
        color: #1e293b;
    }
    
    .booking-hour {
        background: #f1f5f9;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        color: #334155;
    }
    
    .booking-week {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #64748b;
    }
    
    .current-week-tag {
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
    }
    
    .booking-timer {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: #f1f5f9;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .booking-timer .critical {
        color: #dc2626;
        animation: pulse 1s infinite;
    }
    
    .booking-timer .warning {
        color: #f59e0b;
    }
    
    .booking-timer .moderate {
        color: #3b82f6;
    }
    
    .booking-timer .safe {
        color: #10b981;
    }
    
    .booking-timer.expired {
        background: #e2e8f0;
        color: #64748b;
    }
    
    .booking-footer {
        margin-top: 4px;
    }
    
    .cannot-cancel-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: #fee2e2;
        color: #dc2626;
        border-radius: 12px;
        font-size: 10px;
    }
    
    .btn-cancel {
        padding: 6px 12px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-cancel:hover:not(:disabled) {
        background: #dc2626;
        transform: translateY(-1px);
    }
    
    .btn-cancel:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
        opacity: 0.5;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
    }
    
    @media (max-width: 768px) {
        .warning-content {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .progress-container {
            width: 100%;
        }
        
        .counter-info {
            width: 100%;
            justify-content: space-between;
        }
        
        .week-header {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .week-stats {
            width: 100%;
            justify-content: space-between;
        }
        
        .my-booking-item {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .btn-cancel {
            width: 100%;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

console.log('✅ Código carregado completamente!');