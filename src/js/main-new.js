// ============================================
// FRONTEND - SISTEMA DE AGENDAMENTO
// ============================================

// ===== CONFIGURAÇÕES =====
const API = 'https://jokesteronline.org/api';
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19];

// ===== CONSTANTES DE REGRAS =====
const CANCEL_LIMIT_HOURS = 9; // Limite padrão de 9 horas para cancelamento
const PROXIMITY_GRACE_MINUTES = 10; // Período de graça de 10 minutos para aulas próximas

// ===== PLANOS DE ASSINATURA =====
const PLANS = {
    basic: {
        id: 'basic',
        name: 'Básico',
        aulasPorSemana: 2,
        price: 1,
        features: ['2 aulas por semana', 'Acesso a todos horários', 'teste']
    },
    intermediate: {
        id: 'intermediate',
        name: 'Intermediário',
        aulasPorSemana: 3,
        price: 1,
        features: ['3 aulas por semana', 'Acesso a todos horários', 'lletra boa ?']
    },
    advanced: {
        id: 'advanced',
        name: 'Avançado',
        aulasPorSemana: 4,
        price: 1,
        features: ['4 aulas por semana', 'Acesso a todos horários', 'tesrt']
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        aulasPorSemana: 5,
        price: 1,
        features: ['5 aulas por semana', 'Acesso a todos horários', 'teste ']
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
let nextDates = {}; // Cache global para datas
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
// 2. FUNÇÕES DE CONTAGEM E VALIDAÇÃO
// ============================================

// Conta reservas do usuário na semana atual
const getWeeklyBookingsCount = () => {
    if (!currentUser) return 0;
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 5);
    weekEnd.setHours(23, 59, 59, 999);
    
    return bookings.filter(b => {
        if (b.userId !== currentUser.id) return false;
        const bookDate = new Date(b.date + 'T00:00:00');
        return bookDate >= weekStart && bookDate <= weekEnd;
    }).length;
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
            return `❌ Cancelamento não permitido. A aula começa em ${cancelCheck.timeMessage} e o limite é de ${CANCEL_LIMIT_HOURS}h de antecedência.`;
        
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
            warning: `⏰ Esta aula começará em menos de ${CANCEL_LIMIT_HOURS}h. Você terá apenas ${PROXIMITY_GRACE_MINUTES} minutos para cancelar após a reserva.`
        };
    }
    
    return { valid: true };
}

// Tooltip
function showTooltip(element, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    
    setTimeout(() => tooltip.remove(), 3000);
}

// ============================================
// 3. FUNÇÕES DE AVISO SEMANAL
// ============================================

function updateWeeklyWarningWithPlan(limite) {
    if (!weeklyWarning) return;
    
    const weeklyCount = getWeeklyBookingsCount();
    
    if (weeklyCount >= limite) {
        weeklyWarning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span><strong>Atenção!</strong> Você atingiu o limite de ${limite} agendamentos do seu plano</span>
        `;
        weeklyWarning.className = 'weekly-warning warning';
    } else {
        weeklyWarning.innerHTML = `
            <i class="fas fa-chart-line"></i>
            <span>Agendamentos esta semana: <strong>${weeklyCount}/${limite}</strong></span>
        `;
        weeklyWarning.className = 'weekly-warning info';
    }
}

function updateWeeklyWarning() {
    if (!weeklyWarning) return;
    
    if (currentUser?.plan) {
        updateWeeklyWarningWithPlan(currentUser.plan.aulasPorSemana);
        return;
    }
    
    const weeklyCount = getWeeklyBookingsCount();
    weeklyWarning.innerHTML = `
        <i class="fas fa-chart-line"></i>
        <span>Agendamentos esta semana: <strong>${weeklyCount}/3</strong></span>
    `;
    weeklyWarning.className = 'weekly-warning info';
}

// ============================================
// 4. FUNÇÕES AUXILIARES PARA PLANOS
// ============================================

function getPlanName(planId) {
    const names = {
        basic: 'Básico',
        intermediate: 'Intermediário',
        advanced: 'Avançado',
        premium: 'Premium'
    };
    return names[planId] || 'Básico';
}

function getPlanAulas(planId) {
    const aulas = {
        basic: 2,
        intermediate: 3,
        advanced: 4,
        premium: 5
    };
    return aulas[planId] || 2;
}

// ============================================
// 5. FUNÇÃO DE VERIFICAÇÃO DE PLANO ATIVO
// ============================================

function userHasActivePlan() {
    if (!currentUser) return false;
    
    if (currentUser.isAdmin) return true;
    
    console.log('🔍 Verificando plano do usuário:', currentUser);
    
    if (currentUser.plan) {
        if (!currentUser.plan.status || currentUser.plan.status === 'active') {
            console.log('✅ Plano ativo encontrado (direto):', currentUser.plan);
            return true;
        }
    }
    
    if (currentUser.subscription && currentUser.subscription.status === 'active') {
        console.log('✅ Assinatura ativa encontrada:', currentUser.subscription);
        
        if (!currentUser.plan) {
            const planType = currentUser.subscription.planType || 'basic';
            currentUser.plan = {
                id: planType,
                name: getPlanName(planType),
                aulasPorSemana: currentUser.subscription.aulasPorSemana || getPlanAulas(planType),
                status: 'active'
            };
            console.log('📝 Plan criado a partir da subscription:', currentUser.plan);
        }
        return true;
    }
    
    console.log('❌ Nenhum plano ativo encontrado');
    return false;
}

// ============================================
// 6. FUNÇÃO DE VERIFICAÇÃO DE ASSINATURA
// ============================================

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
                        status: 'active'
                    };
                }
            }
            
            if (currentUser.plan) {
                const userInfo = document.getElementById('userInfo');
                if (userInfo && !userInfo.querySelector('.plan-badge')) {
                    const planBadge = document.createElement('span');
                    planBadge.className = 'plan-badge';
                    planBadge.innerHTML = `<i class="fas fa-crown"></i> ${currentUser.plan.name || currentUser.plan.id}`;
                    userInfo.appendChild(planBadge);
                }
                
                updateWeeklyWarningWithPlan(currentUser.plan.aulasPorSemana);
            }
        }
    } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
    }
}

// ============================================
// 7. FUNÇÕES DE CRONÔMETRO
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
// 8. FUNÇÕES DE RENDERIZAÇÃO
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
    } else {
        slot.classList.add('available');
        slot.innerHTML = `<span class="count">0/4</span><span class="label"> Disponível</span>`;
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
        el.innerHTML = '<p class="empty-message"><i class="fas fa-calendar-times"></i> Você não possui reservas ativas</p>';
        return;
    }

    myBookings.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(booking => {
        const item = document.createElement('div');
        item.className = 'my-booking-item';
        
        const bookingDateTime = new Date(`${booking.date}T${String(booking.hour).padStart(2, '0')}:00:00`);
        const datetimeStr = bookingDateTime.toISOString();
        
        const cancelCheck = canCancelBooking(booking);
        const canCancel = cancelCheck.canCancel;
        const formattedDate = formatDate(booking.date);
        const timeRemaining = formatTimeRemaining(bookingDateTime);
        
        item.innerHTML = `
            <div class="booking-info">
                <div class="booking-header">
                    <div class="booking-datetime">
                        <i class="fas fa-calendar-day"></i>
                        <span>${formattedDate}</span>
                        <strong>${booking.hour}:00</strong>
                    </div>
                    <div class="booking-timer" data-datetime="${datetimeStr}">
                        <i class="fas fa-hourglass-half"></i>
                        <span class="${timeRemaining.class}">${timeRemaining.text}</span>
                    </div>
                </div>
                <div class="booking-footer">
                    ${!canCancel ? '<span class="cannot-cancel-badge"><i class="fas fa-lock"></i> Cancelamento bloqueado</span>' : ''}
                </div>
            </div>
            <button class="btn-cancel" data-id="${booking.id}" ${!canCancel ? 'disabled' : ''}>
                <i class="fas fa-times"></i>
                <span>Cancelar</span>
            </button>
        `;
        
        const cancelBtn = item.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => cancelBooking(booking.id));
        
        el.appendChild(item);
    });
    
    startTimers();
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
// 9. FUNÇÕES DE AÇÃO
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
    
    if (!currentUser) {
        showNotification('Faça login para reservar um horário', 'error');
        showAuthScreen();
        return;
    }

    if (!currentUser.plan && !currentUser.isAdmin) {
        showNotification('Você precisa escolher um plano primeiro', 'warning');
        showPlans();
        return;
    }

    if (!isAvailable) {
        showNotification('Este horário está indisponível', 'error');
        return;
    }

    const bookedList = isBooked(date, h);
    
    if (bookedList.some(b => b.userId === currentUser.id)) {
        showNotification('Você já reservou este horário', 'warning');
        return;
    }
    
    if (bookCount >= 4) {
        showNotification('Este horário já está lotado!', 'error');
        return;
    }
    
    const limite = currentUser.plan?.aulasPorSemana || 0;
    if (getWeeklyBookingsCount() >= limite) {
        showNotification(`Seu plano permite apenas ${limite} aulas por semana`, 'warning');
        return;
    }

    openBookingModal(date, h);
}

// ============================================
// 10. FUNÇÕES DE MODAL
// ============================================

function openBookingModal(date, h) {
    modalContext = { date, hour: h };
    
    const bookedList = isBooked(date, h);
    const bookCount = bookedList.length;
    const availableSpots = 4 - bookCount;
    const weeklyCount = getWeeklyBookingsCount();
    
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
            <p class="${availableSpots > 0 ? 'text-success' : 'text-danger'}">
                <i class="fas fa-users"></i> Vagas disponíveis: ${availableSpots}/4
            </p>
            <p>
                <i class="fas fa-chart-line"></i> Agendamentos na semana: ${weeklyCount}/${currentUser.plan?.aulasPorSemana || 3}
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
// 11. FUNÇÕES DE PLANOS E PAGAMENTO
// ============================================

function showPlans() {
    showingPlans = true;
    
    const mainContent = document.querySelector('.main-content') || document.querySelector('.container main');
    const scheduleWrapper = document.querySelector('.schedule-wrapper');
    
    if (!mainContent && !scheduleWrapper) {
        console.error('Elemento principal não encontrado');
        return;
    }
    
    const targetElement = scheduleWrapper || mainContent;
    
    targetElement.innerHTML = `
        <div class="plans-section">
            <h2 class="section-title">
                <i class="fas fa-crown"></i>
                Escolha seu plano para começar
            </h2>
            <p class="plans-subtitle">Selecione o plano que melhor se adequa aos seus objetivos</p>
            
            <div class="plans-container">
                ${Object.values(PLANS).map(plan => `
                    <div class="plan-card ${plan.id}">
                        <div class="plan-badge">${plan.name}</div>
                        <h3>${plan.name}</h3>
                        <div class="price">
                            R$ ${plan.price}
                            <span>/mês</span>
                        </div>
                        <div class="features">
                            ${plan.features.map(f => `
                                <div class="feature">
                                    <i class="fas fa-check"></i>
                                    ${f}
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-select-plan btn-primary" data-plan="${plan.id}">
                            <i class="fas fa-shopping-cart"></i>
                            Escolher plano
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div class="plans-footer">
                <button class="btn-secondary" id="backToSchedule">
                    <i class="fas fa-arrow-left"></i>
                    Voltar para agenda
                </button>
            </div>
        </div>
    `;

    document.querySelectorAll('.btn-select-plan').forEach(btn => {
        btn.addEventListener('click', () => selectPlan(btn.dataset.plan));
    });

    document.getElementById('backToSchedule')?.addEventListener('click', () => {
        showingPlans = false;
        loadData();
    });
    
    const myBookings = document.querySelector('.my-bookings');
    const adminPanel = document.getElementById('adminPanel');
    
    if (myBookings) myBookings.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    
    showNotification('Escolha um plano para continuar', 'info');
}

async function selectPlan(planId) {
    if (!currentUser) {
        showNotification('Faça login primeiro', 'warning');
        showAuthScreen();
        return;
    }

    showNotification('Preparando pagamento...', 'info');

    try {
        const cpf = prompt('Digite seu CPF (somente números):');
        if (!cpf) {
            showNotification('CPF é obrigatório', 'error');
            return;
        }
        
        if (cpf.length !== 11 || !/^\d+$/.test(cpf)) {
            showNotification('CPF deve ter 11 dígitos numéricos', 'error');
            return;
        }

        const response = await fetch(`${API}/payments/subscription/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                planType: planId,
                payerInfo: {
                    documentType: 'CPF',
                    documentNumber: cpf
                }
            })
        });

        const data = await response.json();

        if (data.success && data.data.initPoint) {
            showNotification('Redirecionando para pagamento...', 'success');
            
            setTimeout(() => {
                window.location.href = data.data.initPoint;
            }, 1500);
            
        } else {
            showNotification('Erro: ' + (data.error || 'Falha ao criar assinatura'), 'error');
        }
    } catch (error) {
        console.error('Erro no pagamento:', error);
        showNotification('Erro ao processar pagamento', 'error');
    }
}

// ============================================
// 12. CONTROLE DE TELAS
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
// 13. ATUALIZAÇÃO DE UI
// ============================================

function updateUserInfo() {
    if (!currentUser || !userInfo) return;
    
    const badgeText = currentUser.isAdmin ? 'Admin' : 'Aluno';
    userInfo.innerHTML = `
        <span class="user-badge ${currentUser.isAdmin ? 'admin' : ''}">
            <i class="fas fa-${currentUser.isAdmin ? 'crown' : 'user'}"></i>
            ${badgeText}: ${currentUser.name || currentUser.email}
        </span>
    `;
    checkSubscriptionStatus();
}

// ============================================
// 14. CARREGAR DADOS
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
        
        updateUserInfo();
        
        const precisaPlano = currentUser && 
                            !currentUser.isAdmin && 
                            !userHasActivePlan();
        
        console.log('🔍 Precisa de plano?', precisaPlano);
        console.log('👤 Usuário atual:', currentUser);
        
        if (precisaPlano && !showingPlans) {
            console.log('📢 Mostrando tela de planos');
            showPlans();
        } else {
            console.log('📅 Mostrando agenda normal');
            renderSchedule();
            renderDayControls();
            renderMyBookings();
            startTimers();
            
            const myBookings = document.querySelector('.my-bookings');
            const adminPanel = document.getElementById('adminPanel');
            
            if (myBookings) myBookings.style.display = '';
            if (adminPanel) adminPanel.style.display = currentUser?.isAdmin && adminMode ? '' : 'none';
        }
        
    } catch (e) {
        console.error('❌ Erro ao carregar dados:', e);
        showNotification('Erro ao carregar dados', 'error');
    } finally {
        loading = false;
    }
}

// ============================================
// 15. INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema iniciado - Versão Melhorada');
    
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabCadastro = document.getElementById('tabCadastro');
    const adminToggle = document.getElementById('adminMode');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
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
    
    refreshBtn.addEventListener('click', () => {
        loadData();
        showNotification('Dados atualizados', 'success');
    });
    
    const plansBtn = document.getElementById('plansBtn');
    if (plansBtn) {
        plansBtn.addEventListener('click', () => {
            window.location.href = 'plans.html';
        });
    }
    
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
// 16. ESTILOS ADICIONAIS
// ============================================

const additionalStyles = `
    .booking-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .booking-datetime {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .booking-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
    }
    
    .status-text {
        cursor: help;
        border-bottom: 1px dashed #999;
    }
    
    .booking-info.can-cancel .status-text {
        color: #10b981;
    }
    
    .booking-info.cannot-cancel .status-text {
        color: #ef4444;
    }
    
    .booking-info.grace-period .status-text {
        color: #f59e0b;
        animation: pulse 2s infinite;
    }
    
    .near-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: #f59e0b;
        color: white;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        margin-top: 4px;
        width: fit-content;
    }
    
    .booking-warning {
        margin-top: 12px;
        padding: 10px;
        background: #fff3cd;
        border-left: 4px solid #f59e0b;
        border-radius: 4px;
        font-size: 13px;
        color: #856404;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .booking-warning i {
        color: #f59e0b;
        font-size: 16px;
    }
    
    .tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        max-width: 250px;
        text-align: center;
        z-index: 1000;
        pointer-events: none;
        animation: fadeIn 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .tooltip::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px 5px 0;
        border-style: solid;
        border-color: #333 transparent transparent;
    }
    
    .my-booking-item {
        transition: all 0.3s;
    }
    
    .my-booking-item:hover {
        transform: translateX(4px);
    }
    
    .btn-cancel:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #9ca3af;
    }
    
    .btn-cancel:disabled:hover {
        transform: none;
        box-shadow: none;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

console.log('✅ Código carregado completamente!');