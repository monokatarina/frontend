// admin.js - Painel Admin
const API = '/api';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Admin panel iniciado');
  await loadBookings();
  await loadUsersWithPlans(); // Usar a função com detalhes
});

async function loadBookings() {
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
  try {
    console.log('📅 Carregando reservas...');
    const res = await fetch(`${API}/bookings`);
    const bookings = await res.json();
    
    tbody.innerHTML = '';
    
    // Filtrar apenas reservas futuras e não canceladas
    const hoje = new Date().toISOString().split('T')[0];
    const bookingsFiltradas = bookings.filter(b => 
      b.status !== 'cancelled' && b.date >= hoje
    );
    
    bookingsFiltradas.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
    
    bookingsFiltradas.forEach(b => {
      const tr = document.createElement('tr');
      const categoriaClass = b.categoria === 'danca' ? 'badge danca' : 'badge normal';
      
      tr.innerHTML = `
        <td>${formatarData(b.date)}</td>
        <td>${String(b.hour).padStart(2,'0')}:00</td>
        <td>${b.name}</td>
        <td><span class="${categoriaClass}">${b.categoria === 'danca' ? ' Dança' : ' Treino'}</span></td>
        <td><button class='btn danger' onclick='cancelBooking(${b.id})'>Cancelar</button></td>
      `;
      tbody.appendChild(tr);
    });
    
    if (bookingsFiltradas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhuma reserva futura</td></tr>';
    }
  } catch (e) {
    console.error('❌ Erro ao carregar reservas:', e);
    tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar reservas</td></tr>';
  }
}

// ============================================
// FUNÇÃO PRINCIPAL - CARREGAR USUÁRIOS COM DETALHES
// ============================================
async function loadUsersWithPlans() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
  
  try {
    console.log('👥 Carregando usuários com detalhes...');
    
    // USAR O ENDPOINT CORRETO
    const res = await fetch(`${API}/admin/users/details`);
    console.log('📡 Status da requisição:', res.status);
    
    const data = await res.json();
    console.log('📊 Dados recebidos:', data);
    
    if (!data.success) {
      throw new Error('Erro ao carregar usuários');
    }
    
    const users = data.users;
    console.log('👥 Total de usuários:', users.length);
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Nenhum usuário cadastrado</td></tr>';
      return;
    }
    
    // Ordenar por ID
    users.sort((a, b) => a.id - b.id);
    
    users.forEach(u => {
      const tr = document.createElement('tr');
      
      // ===== PROCESSAR PLANOS =====
      const planos = u.plans || [];
      console.log(`👤 Usuário ${u.id} - Planos:`, planos.length);
      
      let planosHtml = '';
      if (planos.length > 0) {
        planosHtml = planos.map(p => {
          const icon = p.categoria === 'danca' ? ' ' : ' ';
          // Extrair nome amigável
          let nome = p.name || p.id;
          if (nome.includes('Treino Normal')) nome = nome.replace('Treino Normal', 'TN');
          if (nome.includes('Dança')) nome = nome.replace('Dança', 'DÇ');
          
          return `<span class="badge ${p.categoria || 'normal'}">${icon} ${nome}</span>`;
        }).join('<br>');
      } else {
        planosHtml = '<span style="color: #9ca3af; font-style: italic;">Sem planos</span>';
      }
      
      // ===== PROCESSAR VENCIMENTO =====
      let dataVencimento = '—';
      let vencimentoClass = '';
      let statusPagamento = '—';
      let badgeStatus = '';
      
      if (u.pagamento) {
        if (u.pagamento.dataVencimento) {
          dataVencimento = formatarData(u.pagamento.dataVencimento.split('T')[0]);
          
          // Calcular dias até o vencimento
          const hoje = new Date();
          const venc = new Date(u.pagamento.dataVencimento);
          const diasRestantes = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
          
          if (diasRestantes < 0) {
            vencimentoClass = 'vencimento-atrasado';
            badgeStatus = `atrasado-${Math.abs(diasRestantes)}`;
            statusPagamento = `⚠️ Atrasado (${Math.abs(diasRestantes)} dias)`;
          } else if (diasRestantes <= 5) {
            vencimentoClass = 'vencimento-alerta';
            badgeStatus = `alerta-${diasRestantes}`;
            statusPagamento = `⏳ Vence em ${diasRestantes} dias`;
          } else {
            vencimentoClass = 'vencimento-ok';
            badgeStatus = `ok-${diasRestantes}`;
            statusPagamento = `✅ Em dia (${diasRestantes} dias)`;
          }
        }
      }
      
      // ===== VERIFICAR PAGAMENTO PENDENTE =====
      if (u.temPagamentoPendente || u.pendingPayment) {
        const metodo = u.metodoPagamentoPendente || u.pendingPayment?.method || 'desconhecido';
        statusPagamento = `🕐 Pendente (${metodo})`;
        vencimentoClass = 'vencimento-alerta';
        badgeStatus = 'pendente';
      }
      
      // ===== MONTAR LINHA DA TABELA =====
      tr.innerHTML = `
        <td><strong>${u.id}</strong></td>
        <td>${u.name || '—'}</td>
        <td>${u.email || '—'}</td>
        <td>${u.isAdmin ? '<span class="badge admin">👑 Admin</span>' : 'Não'}</td>
        <td class="plan-list">${planosHtml}</td>
        <td class="${vencimentoClass}">${dataVencimento}</td>
        <td><span class="${vencimentoClass}" data-status="${badgeStatus}">${statusPagamento}</span></td>
      `;
      
      tbody.appendChild(tr);
    });
    
    console.log('✅ Tabela de usuários atualizada com sucesso!');
    
  } catch (e) {
    console.error('❌ Erro ao carregar usuários:', e);
    tbody.innerHTML = '<tr><td colspan="7">Erro ao carregar usuários</td></tr>';
  }
}

// ============================================
// FUNÇÃO AUXILIAR PARA FORMATAR DATA
// ============================================
function formatarData(dataStr) {
  if (!dataStr) return '—';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ============================================
// CANCELAR RESERVA
// ============================================
async function cancelBooking(id) {
  if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
  try {
    console.log('🗑️ Cancelando reserva:', id);
    const res = await fetch(`${API}/bookings/${id}`, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
      await loadBookings();
      alert('✅ Reserva cancelada com sucesso!');
    } else {
      const error = await res.json();
      alert('❌ Erro ao cancelar reserva: ' + (error.error || 'Erro desconhecido'));
    }
  } catch (e) {
    console.error('Erro:', e);
    alert('❌ Erro ao cancelar reserva');
  }
}

// ============================================
// BOTÃO VOLTAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  const btnVoltar = document.getElementById('btnVoltar');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', function() {
      window.location.href = '/';
    });
  }
});

// Exportar funções para uso global (necessário para o onclick)
window.cancelBooking = cancelBooking;