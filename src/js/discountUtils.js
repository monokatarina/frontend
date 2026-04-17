// src/js/discountUtils.js
// ============================================
// UTILITÁRIO DE CÁLCULO DE DESCONTOS
// ============================================

const DiscountUtils = {
    /**
     * Calcula preços com desconto considerando planos existentes
     * @param {Array} novosPlanosIds - IDs dos planos sendo comprados agora
     * @param {Object} PLANS - Objeto com todos os planos
     * @param {Array} planosExistentes - Planos que o usuário já possui
     */
    calculateDiscountedPrice(novosPlanosIds, PLANS, planosExistentes = []) {
        if (!novosPlanosIds || !PLANS) {
            return {
                totalOriginal: 0,
                totalComDesconto: 0,
                economia: 0,
                percentualEconomia: 0,
                planosComDesconto: []
            };
        }

        const planosDetalhados = novosPlanosIds.map(id => PLANS[id]).filter(p => p);
        
        let totalOriginal = 0;
        let totalComDesconto = 0;
        const planosComDesconto = [];
        
        // Verificar se USUÁRIO JÁ TEM plano normal (existente OU está comprando agora)
        const temNormalExistente = planosExistentes?.some(p => p.categoria === 'normal') || false;
        const temNormalNaCompra = planosDetalhados.some(p => p.categoria === 'normal');
        const temNormal = temNormalExistente || temNormalNaCompra;
        
        console.log('🎯 [Desconto] Verificando:', {
            temNormalExistente,
            temNormalNaCompra,
            temNormal,
            planosExistentes: planosExistentes?.map(p => p.id),
            novosPlanos: novosPlanosIds
        });
        
        planosDetalhados.forEach(plan => {
            totalOriginal += plan.price;
            
            // Aplicar desconto de 15% em planos de dança quando usuário TEM plano normal
            if (temNormal && plan.categoria === 'danca') {
                const precoComDesconto = plan.price * 0.85;
                totalComDesconto += precoComDesconto;
                planosComDesconto.push({
                    id: plan.id,
                    name: plan.name,
                    valorOriginal: plan.price,
                    valorComDesconto: precoComDesconto,
                    economia: plan.price - precoComDesconto,
                    motivo: 'Usuário já possui plano normal'
                });
                
                console.log(`💰 [Desconto] ${plan.name}: R$ ${plan.price} → R$ ${precoComDesconto} (15% OFF)`);
            } else {
                totalComDesconto += plan.price;
                if (plan.categoria === 'danca' && !temNormal) {
                    console.log(`ℹ️ [Desconto] ${plan.name} sem desconto (usuário não tem plano normal)`);
                }
            }
        });
        
        const economia = totalOriginal - totalComDesconto;
        const percentualEconomia = totalOriginal > 0 
            ? ((economia / totalOriginal) * 100).toFixed(1)
            : 0;
        
        return {
            totalOriginal,
            totalComDesconto,
            economia,
            percentualEconomia,
            planosComDesconto,
            temDesconto: economia > 0,
            motivo: temNormal ? 'Desconto por possuir plano normal' : null
        };
    },

    /**
     * Verifica se um plano de dança tem direito a desconto
     */
    hasDanceDiscount(usuario, planosSendoComprados) {
        const temNormal = 
            usuario?.plans?.some(p => p.categoria === 'normal') || 
            planosSendoComprados?.some(id => {
                const plan = window.PLANS?.[id];
                return plan?.categoria === 'normal';
            }) || false;
        
        return temNormal;
    },

    /**
     * Formata preço em reais
     */
    formatPrice(price) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    },

    /**
     * Cria elemento HTML de badge de desconto
     */
    createDiscountBadge(planosComDesconto, economia, motivo) {
        if (planosComDesconto.length === 0) return null;
        
        const badge = document.createElement('div');
        badge.className = 'discount-badge';
        badge.style.cssText = `
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 15px;
            animation: slideIn 0.5s ease;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        `;
        
        const planosNomes = planosComDesconto.map(p => p.name).join(' + ');
        
        badge.innerHTML = `
            <div style="background: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-tag" style="color: #10b981; font-size: 22px;"></i>
            </div>
            <div style="flex: 1;">
                <strong style="font-size: 16px;">🎉 DESCONTO DE 15% APLICADO!</strong>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.95;">
                    ${motivo || 'Desconto em planos de dança'}
                </p>
                <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">
                    <i class="fas fa-check-circle"></i>
                    ${planosNomes}: R$ ${economia.toFixed(2)} de desconto
                </p>
            </div>
        `;
        
        return badge;
    },

    /**
     * Cria elemento de resumo de economia
     */
    createEconomySummary(totalOriginal, totalComDesconto, economia, percentual) {
        if (economia <= 0) return null;
        
        const summary = document.createElement('div');
        summary.className = 'economy-summary';
        summary.style.cssText = `
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 16px;
            padding: 20px;
            margin: 20px 0;
        `;
        
        summary.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <div style="background: #10b981; width: 4px; height: 30px; border-radius: 2px;"></div>
                <h4 style="color: #059669; margin: 0; font-size: 18px;">Resumo da economia</h4>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 0 5px;">
                <span style="color: #4b5563;">Preço original:</span>
                <span style="color: #6b7280; text-decoration: line-through; font-size: 16px;">
                    R$ ${totalOriginal.toFixed(2)}
                </span>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 0 5px;">
                <span style="color: #4b5563;">Desconto (${percentual}%):</span>
                <span style="color: #10b981; font-weight: 600; font-size: 16px;">
                    - R$ ${economia.toFixed(2)}
                </span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 15px 5px 5px; border-top: 2px dashed #10b981; margin-top: 5px;">
                <span style="font-weight: 700; color: #1f2937; font-size: 18px;">Total a pagar:</span>
                <span style="font-weight: 800; color: #10b981; font-size: 24px;">
                    R$ ${totalComDesconto.toFixed(2)}
                </span>
            </div>
        `;
        
        return summary;
    }
};

// Exportar para uso global
window.DiscountUtils = DiscountUtils;