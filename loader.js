(function () {
    const _fetchOriginal = window.fetch.bind(window);
    const _jsonParse = JSON.parse.bind(JSON);
    let respostasCorretas = {};

    // ============================================================
    //  TOAST
    // ============================================================

    function mostrarToast(texto, cor) {
        if (typeof Toastify === 'undefined') return;
        Toastify({
            text: texto,
            duration: 4000,
            gravity: "bottom",
            position: "center",
            style: {
                background: cor || "#111",
                fontSize: '15px',
                fontFamily: 'Arial, sans-serif',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '5px'
            }
        }).showToast();
    }

    // ============================================================
    //  EXTRAI RESPOSTAS CORRETAS DO itemData
    // ============================================================

    function extrairRespostas(itemData) {
        const widgets = itemData.question.widgets;
        const resultado = {};

        for (const [widgetId, widget] of Object.entries(widgets)) {
            if (widget.type === 'radio') {
                const choices = widget.options.choices;
                const idx = choices.findIndex(c => c.correct === true);
                if (idx !== -1) resultado[widgetId] = { type: 'radio', index: idx };

            } else if (widget.type === 'numeric-input' || widget.type === 'input-number') {
                const correta = widget.options.answers?.find(a => a.status === 'correct');
                if (correta) resultado[widgetId] = { type: 'numeric-input', value: String(correta.value) };

            } else if (widget.type === 'expression') {
                const forms = widget.options.answerForms;
                if (forms?.length > 0) resultado[widgetId] = { type: 'expression', value: forms[0].value };
            }
        }
        return resultado;
    }

    // ============================================================
    //  MODIFICA itemData ANTES DO REACT RENDERIZAR
    //  Para radio: move a correta pro índice 0 e marca claramente
    //  Para numeric-input: já temos o valor, preenchemos via DOM
    // ============================================================

    function modificarItemData(itemData) {
        if (Object.keys(respostasCorretas).length === 0) return itemData;

        const widgets = itemData.question.widgets;
        for (const [widgetId, widget] of Object.entries(widgets)) {
            const resp = respostasCorretas[widgetId];
            if (!resp) continue;

            if (widget.type === 'radio' && resp.type === 'radio') {
                const choices = widget.options.choices;
                const correta = choices[resp.index];
                const erradas = choices.filter((_, i) => i !== resp.index);
                // Coloca a correta primeiro
                widget.options.choices = [
                    { ...correta, correct: true },
                    ...erradas.map(c => ({ ...c, correct: false }))
                ];
                console.log("[Ryan] Radio: correta movida para índice 0 —", correta?.content);
            }
        }
        return itemData;
    }

    // ============================================================
    //  INTERCEPTA JSON.parse (estratégia do script antigo)
    //  Age no momento em que o React processa a resposta da API
    // ============================================================

    JSON.parse = function (json, reviver) {
        let parsed = _jsonParse(json, reviver);
        if (!parsed || typeof parsed !== 'object') return parsed;

        try {
            // Questão nova carregando — itemDataAnswerless (sem resposta)
            // Se já temos respostas salvas, injetamos nela
            if (parsed?.data?.assessmentItemByProblemNumber?.item?.itemDataAnswerless) {
                const item = parsed.data.assessmentItemByProblemNumber.item;
                const itemData = _jsonParse(item.itemDataAnswerless);
                const modificado = modificarItemData(itemData);
                item.itemDataAnswerless = JSON.stringify(modificado);
                console.log("[Ryan] itemDataAnswerless interceptado e modificado!");
            }
        } catch (e) {}

        try {
            // itemData retornado após tentativa — tem correct: true
            if (parsed?.data?.attemptProblem?.result?.itemData) {
                const itemDataStr = parsed.data.attemptProblem.result.itemData;
                const itemData = _jsonParse(itemDataStr);
                const novas = extrairRespostas(itemData);
                if (Object.keys(novas).length > 0) {
                    respostasCorretas = novas;
                    console.log("[Ryan] Respostas capturadas do attemptProblem:", respostasCorretas);
                    mostrarToast("✅ Gabarito capturado! Próxima questão virá com resposta.", "#1a7a4a");
                }
            }
        } catch (e) {}

        return parsed;
    };

    // ============================================================
    //  INTERCEPTA FETCH — após cada tentativa, salva o gabarito
    //  e para inputs numéricos preenche o campo automaticamente
    // ============================================================

    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : input.url;
        const response = await _fetchOriginal.apply(this, arguments);

        if (url.includes('attemptProblem')) {
            try {
                const data = await response.clone().json();
                const itemDataStr = data?.data?.attemptProblem?.result?.itemData;
                if (itemDataStr) {
                    const itemData = _jsonParse(itemDataStr);
                    const novas = extrairRespostas(itemData);
                    if (Object.keys(novas).length > 0) {
                        respostasCorretas = novas;
                        // Para numeric-input, preenche o campo da PRÓXIMA questão quando aparecer
                        for (const [, resp] of Object.entries(respostasCorretas)) {
                            if (resp.type === 'numeric-input' || resp.type === 'expression') {
                                // Aguarda a próxima questão renderizar e preenche
                                const tentarPreencher = (tentativas) => {
                                    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'))
                                        .filter(i => i.offsetParent !== null);
                                    if (inputs.length > 0) {
                                        inputs.forEach(input => {
                                            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                            setter.call(input, resp.value);
                                            input.dispatchEvent(new Event('input', { bubbles: true }));
                                            input.dispatchEvent(new Event('change', { bubbles: true }));
                                        });
                                        console.log("[Ryan] Input numérico preenchido:", resp.value);
                                        mostrarToast("✅ Campo preenchido: " + resp.value, "#1a7a4a");
                                    } else if (tentativas > 0) {
                                        setTimeout(() => tentarPreencher(tentativas - 1), 500);
                                    }
                                };
                                setTimeout(() => tentarPreencher(10), 1000);
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        return response;
    };

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
            console.log("[Ryan] Pronto! Responda uma questão qualquer — a partir da 2ª virá com o gabarito marcado.");
        };
        document.head.appendChild(s);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', carregarToastify);
    } else {
        carregarToastify();
    }

})();
