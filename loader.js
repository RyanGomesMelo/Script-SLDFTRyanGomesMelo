(function () {
    const _fetchOriginal = window.fetch.bind(window);
    let tentativaEmAndamento = false;

    // ============================================================
    //  UTILITÁRIOS
    // ============================================================

    function mostrarToast(texto, cor) {
        if (typeof Toastify === 'undefined') return;
        Toastify({
            text: texto,
            duration: 4000,
            gravity: "bottom",
            position: "center",
            style: {
                background: cor || "#000",
                fontSize: '15px',
                fontFamily: 'Arial, sans-serif',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '5px'
            }
        }).showToast();
    }

    // Extrai a resposta correta do itemData retornado pelo servidor após tentativa
    function extrairResposta(itemData) {
        const widgets = itemData.question.widgets;
        const resultado = {};

        for (const [widgetId, widget] of Object.entries(widgets)) {
            if (widget.type === 'radio') {
                const choices = widget.options.choices;
                const idx = choices.findIndex(c => c.correct === true);
                if (idx !== -1) resultado[widgetId] = { type: 'radio', index: idx, content: choices[idx].content };

            } else if (widget.type === 'numeric-input' || widget.type === 'input-number') {
                const answers = widget.options.answers;
                const correta = answers?.find(a => a.status === 'correct');
                if (correta) resultado[widgetId] = { type: 'numeric-input', value: String(correta.value) };

            } else if (widget.type === 'expression') {
                const forms = widget.options.answerForms;
                if (forms?.length > 0) resultado[widgetId] = { type: 'expression', value: forms[0].value };
            }
        }
        return resultado;
    }

    // Preenche o DOM com a resposta correta e confirma
    function preencherDOMComResposta(respostas) {
        for (const [widgetId, resp] of Object.entries(respostas)) {
            if (resp.type === 'radio') {
                const inputs = document.querySelectorAll('input[type="radio"]');
                if (inputs[resp.index]) {
                    inputs[resp.index].click();
                    console.log("[Ryan] Radio clicado no índice:", resp.index);
                }
            } else {
                // numeric-input, expression, input-number
                const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
                inputs.forEach(input => {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(input, resp.value);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log("[Ryan] Input preenchido com:", resp.value);
                });
            }
        }

        // Clica em verificar após preencher
        setTimeout(() => {
            const botoes = Array.from(document.querySelectorAll('button'));
            const verificar = botoes.find(b => {
                const t = b.textContent.trim().toLowerCase();
                return t.includes('verificar') || t.includes('check') || t.includes('confirmar');
            });
            if (verificar) {
                verificar.click();
                console.log("[Ryan] Botão verificar clicado.");
                mostrarToast("✅ Respondido com sucesso!", "#1a7a4a");
            }
        }, 600);
    }

    // ============================================================
    //  INTERCEPTAÇÃO DO FETCH
    // ============================================================

    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : input.url;
        const response = await _fetchOriginal.apply(this, arguments);

        // Após tentativa falsa → servidor retorna itemData com respostas
        if (url.includes('attemptProblem')) {
            try {
                const data = await response.clone().json();
                const itemDataStr = data?.data?.attemptProblem?.result?.itemData;
                if (itemDataStr && tentativaEmAndamento) {
                    const itemData = JSON.parse(itemDataStr);
                    const respostas = extrairResposta(itemData);
                    console.log("[Ryan] Respostas extraídas:", respostas);
                    if (Object.keys(respostas).length > 0) {
                        mostrarToast("✅ Resposta encontrada! Preenchendo...", "#1a7a4a");
                        setTimeout(() => {
                            tentativaEmAndamento = false;
                            preencherDOMComResposta(respostas);
                        }, 800);
                    } else {
                        tentativaEmAndamento = false;
                    }
                }
            } catch (e) {
                console.error("[Ryan] Erro em attemptProblem:", e);
                tentativaEmAndamento = false;
            }
        }

        // Nova questão carregada → faz tentativa falsa
        if (url.includes('getAssessmentItemByProblemNumber') && !tentativaEmAndamento) {
            try {
                const data = await response.clone().json();
                const item = data?.data?.assessmentItemByProblemNumber?.item;
                if (item) {
                    console.log("[Ryan] Questão carregada:", item.id, "Fazendo tentativa falsa...");
                    setTimeout(() => fazerTentativaFalsaViaDom(item), 1200);
                }
            } catch (e) { console.error("[Ryan] Erro em getAssessmentItemByProblemNumber:", e); }
        }

        return response;
    };

    // ============================================================
    //  TENTATIVA FALSA VIA DOM (mais confiável que Apollo direto)
    // ============================================================

    function fazerTentativaFalsaViaDom(item) {
        if (tentativaEmAndamento) return;
        tentativaEmAndamento = true;

        try {
            const itemData = JSON.parse(item.itemDataAnswerless);
            const widgets = itemData.question.widgets;

            // Preenche com valor inválido/falso só para disparar a requisição
            for (const [widgetId, widget] of Object.entries(widgets)) {
                if (widget.type === 'radio') {
                    // Clica na última opção (provavelmente errada)
                    const inputs = document.querySelectorAll('input[type="radio"]');
                    const ultimo = inputs[inputs.length - 1];
                    if (ultimo) ultimo.click();

                } else {
                    // Preenche com "0" nos inputs de texto
                    const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
                    inputs.forEach(input => {
                        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        setter.call(input, "0");
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
            }

            // Clica em verificar para enviar a tentativa falsa
            setTimeout(() => {
                const botoes = Array.from(document.querySelectorAll('button'));
                const verificar = botoes.find(b => {
                    const t = b.textContent.trim().toLowerCase();
                    return t.includes('verificar') || t.includes('check') || t.includes('confirmar');
                });
                if (verificar) {
                    verificar.click();
                    console.log("[Ryan] Tentativa falsa enviada via DOM.");
                    mostrarToast("🔍 Buscando resposta...", "#555");
                } else {
                    console.warn("[Ryan] Botão verificar não encontrado.");
                    tentativaEmAndamento = false;
                }
            }, 400);

        } catch (e) {
            console.error("[Ryan] Erro na tentativa falsa:", e);
            tentativaEmAndamento = false;
        }
    }

    // ============================================================
    //  CARREGA TOASTIFY
    // ============================================================

    function carregarToastify() {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
        document.head.appendChild(css);

        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/toastify-js';
        s.onload = () => {
            mostrarToast("🚀 Ryan Script ativado!", "#111");
            console.log("[Ryan] Script pronto.");
        };
        document.head.appendChild(s);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', carregarToastify);
    } else {
        carregarToastify();
    }

})();
