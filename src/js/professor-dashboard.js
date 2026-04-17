// ============================================
// PAINEL DO PROFESSOR - DASHBOARD COMPLETO
// ============================================

const API = 'https://jokesteronline.org/api';
const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Mapeamento de planos para cores e ícones
const PLAN_STYLES = {
    normal_2x: { name: 'Treino 2x', color: '#10b981', icon: 'fa-dumbbell', bg: '#d1fae5' },
    normal_3x: { name: 'Treino 3x', color: '#3b82f6', icon: 'fa-dumbbell', bg: '#dbeafe' },
    normal_5x: { name: 'Treino 5x', color: '#8b5cf6', icon: 'fa-crown', bg: '#ede9fe' },
    danca_2x: { name: 'Dança 2x', color: '#ec4899', icon: 'fa-music', bg: '#fce7f3' },
    danca_3x: { name: 'Dança 3x', color: '#ec4899', icon: 'fa-music', bg: '#fce7f3' }
};

let currentUser = null;
let bookings = [];
let selectedDate = new Date();
let filterType = 'all';

// Elementos DOM
const professorInfo = document.getElementById('professorInfo');
const selectedDateEl = document.getElementById('selectedDate');
const datePicker = document.getElementById('datePicker');
const timeline = document.getElementById('timeline');
const studentsGrid = document.getElementById('studentsGrid');
const totalAulas = document.getElementById('totalAulas');
const totalAlunos = document.getElementById('totalAlunos');
const proximaAula = document.getElementById('proximaAula');

// ===== VERIFICAÇÃO DE ADMIN =====
function checkAdmin() {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
        window.location.href = '/';
        return false;
    }
    
    try {
        currentUser = JSON.parse(savedUser);
        
        if (!currentUser.isAdmin) {
            alert('Acesso restrito a administradores!');
            window.location.href = '/';
            return false;
        }
        
        updateProfessorInfo();
        return true;
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        window.location.href = '/';
        return false;
    }
}

// ===== ATUALIZAR INFO DO PROFESSOR =====
function updateProfessorInfo() {
    if (!professorInfo) return;
    
    professorInfo.innerHTML = `
        <span class="professor-badge">
            <i class="fas fa-chalkboard-teacher"></i>
            Prof. ${currentUser?.name || 'Professor'}
        </span>
    `;
}

// ===== FORMATAR DATA =====
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateBR(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ===== IDENTIFICAR TIPO DE PLANO =====
function getPlanType(booking) {
    // Tentar identificar pelo ID do plano
    if (booking.planId && PLAN_STYLES[booking.planId]) {
        return PLAN_STYLES[booking.planId];
    }
    
    // Tentar identificar pelo nome do plano
    if (booking.planName) {
        for (const [key, value] of Object.entries(PLAN_STYLES)) {
            if (booking.planName.toLowerCase().includes(value.name.toLowerCase())) {
                return value;
            }
        }
    }
    
    // Identificar pelo horário (horários de dança: 14, 15)
    const hour = Number(booking.hour);
    if (hour === 14 || hour === 15) {
        return PLAN_STYLES.danca_2x;
    }
    
    // Fallback para treino normal
    return PLAN_STYLES.normal_2x;
}

// ===== CARREGAR RESERVAS =====
async function loadBookings() {
    try {
        const response = await fetch(`${API}/bookings`, {
            credentials: 'include'
        });
        const data = await response.json();
        bookings = data.data || data || [];
        
        updateDisplay();
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

// ===== ATUALIZAR DISPLAY =====
function updateDisplay() {
    const dateStr = formatDate(selectedDate);
    const dayBookings = bookings.filter(b => b.date === dateStr);
    
    // Agrupar por horário
    const grouped = groupByHour(dayBookings);
    
    updateSummary(dayBookings, grouped);
    renderTimeline(grouped);
    renderStudentsGrid(grouped);
    updateDateDisplay();
}

// ===== AGRUPAR POR HORÁRIO =====
function groupByHour(bookings) {
    const grouped = {};
    
    bookings.forEach(booking => {
        const hour = Number(booking.hour);
        if (!grouped[hour]) {
            grouped[hour] = {
                hour: hour,
                students: [],
                status: booking.status || 'pending'
            };
        }
        grouped[hour].students.push(booking);
    });
    
    // Ordenar por horário
    return Object.values(grouped).sort((a, b) => a.hour - b.hour);
}

// ===== ATUALIZAR SUMMARY CARDS =====
function updateSummary(dayBookings, grouped) {
    if (totalAulas) totalAulas.textContent = grouped.length;
    if (totalAlunos) totalAlunos.textContent = dayBookings.length;
    
    // Próxima aula
    const now = new Date();
    const currentHour = now.getHours();
    
    const nextClass = grouped.find(g => g.hour > currentHour);
    if (proximaAula) {
        proximaAula.textContent = nextClass ? `${nextClass.hour}:00` : '---';
    }
}

// ===== RENDERIZAR TIMELINE =====
function renderTimeline(grouped) {
    if (!timeline) return;
    
    if (grouped.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhuma aula agendada para este dia</p>
            </div>
        `;
        return;
    }
    
    let filtered = grouped;
    if (filterType === 'pending') {
        filtered = grouped.filter(g => g.status === 'pending');
    } else if (filterType === 'completed') {
        filtered = grouped.filter(g => g.status === 'completed');
    }
    
    timeline.innerHTML = filtered.map(group => {
        const firstStudent = group.students[0];
        const planType = getPlanType(firstStudent);
        
        return `
            <div class="timeline-item ${group.status}" data-hour="${group.hour}">
                <div class="timeline-time" style="color: ${planType.color}">
                    ${group.hour}:00
                </div>
                <div class="timeline-content">
                    <div class="class-info">
                        <div class="class-header">
                            <span class="class-hour">${group.students.length} aluno${group.students.length > 1 ? 's' : ''}</span>
                            <span class="class-plan-badge" style="background: ${planType.bg}; color: ${planType.color}">
                                <i class="fas ${planType.icon}"></i>
                                ${planType.name}
                            </span>
                        </div>
                        <div class="class-students">
                            <i class="fas fa-user-graduate"></i>
                            ${group.students.map(s => s.name).join(', ')}
                        </div>
                        <span class="class-status ${group.status}">
                            ${group.status === 'pending' ? '⏳ Pendente' : '✅ Concluída'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDERIZAR GRID DE ALUNOS =====
function renderStudentsGrid(grouped) {
    if (!studentsGrid) return;
    
    if (grouped.length === 0) {
        studentsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-users-slash"></i>
                <p>Nenhum aluno agendado</p>
            </div>
        `;
        return;
    }
    
    studentsGrid.innerHTML = grouped.map(group => {
        const firstStudent = group.students[0];
        const planType = getPlanType(firstStudent);
        
        return `
            <div class="hour-card" style="border-left: 4px solid ${planType.color}">
                <div class="hour-header">
                    <span class="hour-time" style="color: ${planType.color}">
                        <i class="fas fa-clock"></i> ${group.hour}:00
                    </span>
                    <span class="student-count" style="background: ${planType.color}">${group.students.length}/4</span>
                </div>
                <div class="plan-type-indicator" style="background: ${planType.bg}; color: ${planType.color}">
                    <i class="fas ${planType.icon}"></i>
                    ${planType.name}
                </div>
                <div class="students-list">
                    ${group.students.map(student => {
                        const studentPlan = getPlanType(student);
                        return `
                            <div class="student-item">
                                <div class="student-info">
                                    <div class="student-avatar" style="background: ${studentPlan.bg}; color: ${studentPlan.color}">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <div class="student-name">${student.name}</div>
                                        <div class="student-plan" style="color: ${studentPlan.color}">
                                            <i class="fas ${studentPlan.icon}"></i>
                                            ${studentPlan.name}
                                        </div>
                                    </div>
                                </div>
                                <div class="student-check" data-student-id="${student.id}">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ===== ATUALIZAR DISPLAY DA DATA =====
function updateDateDisplay() {
    if (!selectedDateEl || !datePicker) return;
    
    const dateStr = formatDateBR(selectedDate);
    selectedDateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    datePicker.value = formatDate(selectedDate);
}

// ===== MUDAR DATA =====
function changeDate(days) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    selectedDate = newDate;
    updateDisplay();
}

// ===== ABRIR MODAL DA AULA =====
function openClassModal(hour) {
    const dateStr = formatDate(selectedDate);
    const classBookings = bookings.filter(b => 
        b.date === dateStr && Number(b.hour) === hour
    );
    
    const modal = document.getElementById('classModal');
    const modalBody = document.getElementById('classModalBody');
    const modalTitle = document.getElementById('classModalTitle');
    
    if (!modal || !modalBody || !modalTitle) return;
    
    const firstBooking = classBookings[0];
    const planType = getPlanType(firstBooking);
    
    modalTitle.innerHTML = `
        <i class="fas fa-clock" style="color: ${planType.color}"></i> 
        Aula das ${hour}:00 - ${planType.name}
    `;
    
    modalBody.innerHTML = `
        <div class="class-details">
            <div class="class-detail-item" style="border-left: 4px solid ${planType.color}">
                <span class="detail-label">Horário:</span>
                <span class="detail-value">${hour}:00 - ${hour + 1}:00</span>
            </div>
            <div class="class-detail-item">
                <span class="detail-label">Total alunos:</span>
                <span class="detail-value">${classBookings.length}/4</span>
            </div>
            <div class="class-detail-item">
                <span class="detail-label">Tipo de aula:</span>
                <span class="detail-value" style="color: ${planType.color}">
                    <i class="fas ${planType.icon}"></i> ${planType.name}
                </span>
            </div>
            <div class="class-detail-item">
                <span class="detail-label">Alunos:</span>
                <div class="student-list-modal">
                    ${classBookings.map(s => {
                        const studentPlan = getPlanType(s);
                        return `
                            <div class="student-item-modal" style="border-left: 3px solid ${studentPlan.color}">
                                <i class="fas ${studentPlan.icon}" style="color: ${studentPlan.color}"></i>
                                ${s.name}
                                <span class="student-plan-tag" style="background: ${studentPlan.bg}; color: ${studentPlan.color}">
                                    ${studentPlan.name}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    modal.hidden = false;
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Configurar botão de marcar como concluída
    const markCompletedBtn = document.getElementById('markCompleted');
    if (markCompletedBtn) {
        // Remover listeners antigos
        const newBtn = markCompletedBtn.cloneNode(true);
        markCompletedBtn.parentNode.replaceChild(newBtn, markCompletedBtn);
        
        newBtn.addEventListener('click', () => {
            markClassCompleted(hour);
        });
    }
}

// ===== MARCAR AULA COMO CONCLUÍDA =====
async function markClassCompleted(hour) {
    const dateStr = formatDate(selectedDate);
    
    // Aqui você pode implementar a chamada para o backend
    showNotification(`Aula das ${hour}:00 marcada como concluída!`, 'success');
    
    // Atualizar status localmente (exemplo)
    bookings = bookings.map(b => {
        if (b.date === dateStr && Number(b.hour) === hour) {
            return { ...b, status: 'completed' };
        }
        return b;
    });
    
    updateDisplay();
    closeModal();
}

// ===== MARCAR ALUNO COMO PRESENTE =====
function markStudentPresent(studentId) {
    showNotification('Presença registrada!', 'success');
}

// ===== FECHAR MODAL =====
function closeModal() {
    const modal = document.getElementById('classModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.hidden = true;
        }, 300);
    }
}

// ===== NOTIFICAÇÕES =====
function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        // Criar notificação simples
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupDynamicListeners() {
    // Timeline items
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const hour = this.dataset.hour;
            if (hour) openClassModal(parseInt(hour));
        });
    });
    
    // Student check buttons
    document.querySelectorAll('.student-check').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const studentId = this.dataset.studentId;
            if (studentId) markStudentPresent(parseInt(studentId));
        });
    });
}

// Sobrescrever funções de renderização
const originalRenderTimeline = renderTimeline;
renderTimeline = function(grouped) {
    originalRenderTimeline(grouped);
    setTimeout(setupDynamicListeners, 100);
};

const originalRenderStudentsGrid = renderStudentsGrid;
renderStudentsGrid = function(grouped) {
    originalRenderStudentsGrid(grouped);
    setTimeout(setupDynamicListeners, 100);
};

// ===== FILTROS =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        filterType = e.target.dataset.filter;
        
        const dateStr = formatDate(selectedDate);
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const grouped = groupByHour(dayBookings);
        renderTimeline(grouped);
    });
});

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdmin()) return;
    
    // Configurar data inicial
    selectedDate = new Date();
    if (datePicker) datePicker.value = formatDate(selectedDate);
    
    // Carregar dados
    loadBookings();
    
    // Event listeners
    const prevDay = document.getElementById('prevDay');
    const nextDay = document.getElementById('nextDay');
    const todayBtn = document.getElementById('todayBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    
    if (prevDay) {
        prevDay.addEventListener('click', () => changeDate(-1));
    }
    
    if (nextDay) {
        nextDay.addEventListener('click', () => changeDate(1));
    }
    
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            selectedDate = new Date();
            updateDisplay();
        });
    }
    
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            selectedDate = new Date(e.target.value);
            updateDisplay();
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadBookings);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('classModal');
        if (e.target === modal) closeModal();
    });
    
    // Adicionar estilos de animação se não existirem
    if (!document.getElementById('professorAnimations')) {
        const style = document.createElement('style');
        style.id = 'professorAnimations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .timeline-item {
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .timeline-item:hover {
                transform: translateX(5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .class-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 5px;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .class-plan-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .plan-type-indicator {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin: 10px 0;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                width: fit-content;
            }
            
            .hour-card {
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .hour-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            }
            
            .hour-time {
                display: flex;
                align-items: center;
                gap: 5px;
                font-weight: 600;
            }
            
            .student-item-modal {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: white;
                border-radius: 6px;
                margin-bottom: 5px;
            }
            
            .student-plan-tag {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                margin-left: auto;
            }
            
            /* Responsividade */
            @media (max-width: 768px) {
                .timeline-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .timeline-time {
                    min-width: auto;
                }
                
                .class-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .class-plan-badge {
                    width: 100%;
                    justify-content: center;
                }
                
                .hour-card {
                    padding: 12px;
                }
                
                .student-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .student-check {
                    align-self: flex-end;
                }
                
                .student-item-modal {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 5px;
                }
                
                .student-plan-tag {
                    margin-left: 0;
                }
            }
            
            @media (max-width: 480px) {
                .summary-cards {
                    grid-template-columns: 1fr;
                }
                
                .timeline-filters {
                    flex-wrap: wrap;
                }
                
                .filter-btn {
                    flex: 1;
                    text-align: center;
                    padding: 8px 4px;
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
});