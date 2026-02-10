let _dadosLogin = null;
let _antigoTitle = document.title;
document.title += ": <3";

// Removido o Object.defineProperty que causava o erro.
// Criamos uma função simples para disparar o seu script de respostas.
function carregarScriptRespostas(dados) {
    _dadosLogin = dados;
    // Expõe globalmente para o script 'answer.js' conseguir ler, 
    // mas sem tentar redefinir o que já existe no window original.
    window._dadosLoginGeral = dados; 

    const script = document.createElement('script');
    script.type = "module";
    // Usando o link que você forneceu no código anterior
    script.src = 'https://ryangomesmelo.github.io/Script-SLDFT/answer.js';
    document.body.appendChild(script);
    document.title = _antigoTitle;
    console.log("✅ Dados de login capturados e script de resposta injetado.");
}

const originalFetch = window.fetch;

window.fetch = async function(url, options) {
    const response = await originalFetch.apply(this, arguments);

    // Intercepta a URL de token/login
    if (typeof url === 'string' && url.includes('/registration/edusp/token')) {
        try {
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();
            
            // Em vez de 'dadosLogin = data' (que dispararia o setter proibido),
            // chamamos a função diretamente.
            if (data && !_dadosLogin) {
                carregarScriptRespostas(data);
            }
        } catch (error) {
            console.error("Erro ao processar token:", error);
        }
    }

    return response;
};
