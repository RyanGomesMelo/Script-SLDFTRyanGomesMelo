// --- CONFIGURAÇÕES INICIAIS ---
const regex = /https:\/\/saladofuturo\.educacao\.sp\.gov\.br\/resultado\/tarefa\/\d+\/resposta\/\d+/;
const headers_template = {
    "x-api-realm": "edusp",
    "x-api-platform": "webclient",
    "x-api-key": _dadosLogin.auth_token,
    "content-type": "application/json"
};

// --- FUNÇÕES DE UTILIDADE E TRATAMENTO ---

function removeHtmlTags(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.textContent || div.innerText || '';
}

// 🔥 NOVO: função que muda o título para confirmar a ação
function FixtureTitle() {
    const old = document.title;
    document.title = "Ryan <3";
    setTimeout(() => document.title = old, 1500);
}

// 🔥 NOVO: envia uma resposta vazia para forçar o servidor a devolver o gabarito no response
async function forcaGabarito(taskId, answerId) {
    const dummy = {
        accessed_on: new Date().toISOString(),
        executed_on: new Date().toISOString(),
        answers: {}
    };
    await fetch(`https://edusp-api.ip.tv/tms/task/${answerId}/answer/${taskId}`, {
        method: 'PUT',
        headers: headers_template,
        body: JSON.stringify(dummy)
    });
}

function transformJson(jsonOriginal) {
    let novoJson = {
        accessed_on: jsonOriginal.accessed_on,
        executed_on: jsonOriginal.executed_on,
        answers: {}
    };

    for (let questionId in jsonOriginal.answers) {
        let question = jsonOriginal.answers[questionId];
        let taskQuestion = jsonOriginal.task.questions.find(q => q.id === parseInt(questionId));

        if (!taskQuestion) continue;

        if (taskQuestion.type === "order-sentences") {
            let answer = taskQuestion.options.sentences.map(sentence => sentence.value);
            novoJson.answers[questionId] = { question_id: question.question_id, question_type: taskQuestion.type, answer: answer };
        } else if (taskQuestion.type === "fill-words") {
            let answer = taskQuestion.options.phrase.map(item => item.value).filter((_, index) => index % 2 !== 0);
            novoJson.answers[questionId] = { question_id: question.question_id, question_type: taskQuestion.type, answer: answer };
        } else if (taskQuestion.type === "text_ai") {
            let answer = removeHtmlTags(taskQuestion.comment.replace(/<\/?p>/g, ''));
            novoJson.answers[questionId] = { question_id: question.question_id, question_type: taskQuestion.type, answer: { "0": answer } };
        } else if (taskQuestion.type === "fill-letters") {
            novoJson.answers[questionId] = { question_id: question.question_id, question_type: taskQuestion.type, answer: taskQuestion.options.answer };
        } else if (taskQuestion.type === "cloud") {
            novoJson.answers[questionId] = { question_id: question.question_id, question_type: taskQuestion.type, answer: taskQuestion.options.ids };
        } else {
            let answer = Object.fromEntries(Object.keys(taskQuestion.options).map(optionId => [optionId, taskQuestion.options[optionId].answer]));
            novoJson.answers[questionId] = { question_id: question.question_id, question_type: taskQuestion.type, answer: answer };
        }
    }
    return novoJson;
}

async function responderCorretamente(respostasAnteriores, task_id, id) {
    const put_answers_url = `https://edusp-api.ip.tv/tms/task/${id}/answer/${task_id}`;
    const novasRespostas = transformJson(respostasAnteriores);
    await fetch(put_answers_url, {
        method: "PUT",
        headers: headers_template,
        body: JSON.stringify(novasRespostas)
    });
}

// --- CARREGAMENTO E INTERCEPTAÇÃO ---

async function loadScript(url) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function loadCss(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
}

// Inicialização principal
(async () => {
    await loadCss('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
    await loadScript('https://cdn.jsdelivr.net/npm/toastify-js');

    Toastify({
        text: "Injetado com Sucesso! Code: Ryan",
        duration: 5000,
        gravity: "bottom",
        position: "center",
        style: { background: "#000000" }
    }).showToast();

    const originalFetch = window.fetch;
    const targetRegex = /^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/;
    // 🔥 NOVO: Regex para interceptar o PUT que agora contém o gabarito no response
    const targetPutRegex = /^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer\/\d+$/;

    window.fetch = async function(input, init) {
        let url = typeof input === 'string' ? input : input.url;
        const response = await originalFetch.apply(this, arguments);

        // 🔥 NOVO: Intercepta o PUT. Se o corpo da resposta trouxer o gabarito (data.answers), ele re-envia corrigido.
        if (targetPutRegex.test(url) && init && init.method === 'PUT') {
            try {
                const cloned = response.clone();
                const data = await cloned.json();
                if (data.answers && data.task) {
                    await responderCorretamente(data, data.task_id, data.id);
                    FixtureTitle();
                }
            } catch (e) { }
        }

        // Trigger inicial: Quando você entra na tarefa
        if (targetRegex.test(url)) {
            try {
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();
                // Se for um rascunho, "força" um envio para o servidor liberar o gabarito no próximo passo
                if (data.status === "draft") {
                    await forcaGabarito(data.id, data.task_id);
                }
            } catch (err) { }
        }

        return response;
    };
})();
