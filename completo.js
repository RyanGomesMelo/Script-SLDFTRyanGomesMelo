(async () => {
    document.title = "Codigo do Ryan <3";
  
    // Etapa 1
    const s = document.createElement('script');
    s.src = 'https://ryangomesmelo.github.io/Script-SLDFTRyanGomesMelo/stage1.js';
    document.body.appendChild(s);
  
    // Etapa 2
    let _dadosLogin = null;
    const _antigoTitle = document.title;
    Object.defineProperty(window, 'dadosLogin', {
      get() {
        return _dadosLogin;
      },
      set(value) {
        _dadosLogin = value;
        if (value) {
          const script = document.createElement('script');
          script.type = "module";
          script.src = 'https://ryangomesmelo.github.io/Script-SLDFT/answer.js';
          document.body.appendChild(script);
        }
      }
    });
  
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      if (url === 'https://edusp-api.ip.tv/registration/edusp/token') {
        return originalFetch(url, options)
          .then(response => {
            response.clone().json().then(data => {
              dadosLogin = data;
            });
            return response;
          })
          .catch(error => {
            throw error;
          });
      }
      return originalFetch(url, options);
    };
  
    // Etapa 3
    const regex = /https:\/\/saladofuturo\.educacao\.sp\.gov\.br\/resultado\/tarefa\/\d+\/resposta\/\d+/;
    let oldHref = document.location.href;
  
    function removeHtmlTags(htmlString) {
      const div = document.createElement('div');
      div.innerHTML = htmlString;
      return div.textContent || div.innerText || '';
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
  
        if (taskQuestion.type === "order-sentences") {
          let answer = taskQuestion.options.sentences.map(sentence => sentence.value);
          novoJson.answers[questionId] = {
            question_id: question.question_id,
            question_type: taskQuestion.type,
            answer: answer
          };
        } else if (taskQuestion.type === "fill-words") {
          let pre_answer = taskQuestion.options;
          let answer = pre_answer.phrase
            .map(item => item.value)
            .filter((_, index) => index % 2 !== 0);
          novoJson.answers[questionId] = {
            question_id: question.question_id,
            question_type: taskQuestion.type,
            answer: answer
          };
        } else if (taskQuestion.type === "text_ai") {
          let answer = taskQuestion.comment.replace(/<\/?p>/g, '');
          answer = removeHtmlTags(answer);
          novoJson.answers[questionId] = {
            question_id: question.question_id,
            question_type: taskQuestion.type,
            answer: { "0": answer }
          };
        } else if (taskQuestion.type === "fill-letters") {
          let answer = taskQuestion.options.answer;
          novoJson.answers[questionId] = {
            question_id: question.question_id,
            question_type: taskQuestion.type,
            answer: answer
          };
        } else if (taskQuestion.type === "cloud") {
          let answer = taskQuestion.options.ids;
          novoJson.answers[questionId] = {
            question_id: question.question_id,
            question_type: taskQuestion.type,
            answer: answer
          };
        } else {
          let answer = Object.fromEntries(
            Object.keys(taskQuestion.options).map(optionId => [optionId, taskQuestion.options[optionId].answer])
          );
          novoJson.answers[questionId] = {
            question_id: question.question_id,
            question_type: taskQuestion.type,
            answer: answer
          };
        }
      }
      return novoJson;
    }
  
    function sendToast(text, duration = 5000, gravity = 'bottom', imageUrl = null, fontSize = '16px', fontFamily = 'Arial, sans-serif', color = '#ffffff') {
      const toast = Toastify({
        text: text,
        duration: duration,
        gravity: gravity,
        position: "center",
        stopOnFocus: true,
        style: {
          background: "#000000",
          fontSize: fontSize,
          fontFamily: fontFamily,
          color: color,
          padding: '10px 20px',
          borderRadius: '5px',
          display: 'flex',
          alignItems: 'center'
        }
      });
  
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.marginRight = '10px';
        toast.toastElement.prepend(img);
      }
  
      toast.showToast();
    }
  
    function loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  
    async function loadCss(url) {
      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = url;
        link.onload = () => resolve();
        document.head.appendChild(link);
      });
    }
  
    async function pegarRespostas(task_id, id) {
      const get_anwsers_url = `https://edusp-api.ip.tv/tms/task/${id}/answer/${task_id}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
      const respostas = await fetch(get_anwsers_url, {
        method: "GET",
        headers: {
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
          "x-api-key": _dadosLogin.auth_token,
          "content-type": "application/json"
        }
      }).then(r => r.json());
      return respostas;
    }
  
    async function responderCorretamente(respostasAnteriores, task_id, id) {
      const put_answers_url = `https://edusp-api.ip.tv/tms/task/${id}/answer/${task_id}`;
      const novasRespostas = transformJson(respostasAnteriores);
      await fetch(put_answers_url, {
        method: "PUT",
        headers: {
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
          "x-api-key": _dadosLogin.auth_token,
          "content-type": "application/json"
        },
        body: JSON.stringify(novasRespostas)
      });
    }
  
    await loadCss('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
  
    loadScript('https://cdn.jsdelivr.net/npm/toastify-js').then(() => {
      sendToast("Injetado com Sucesso! Code: Ryan", 5000, 'bottom');
  
      const originalFetch = window.fetch;
      const targetRegex = /^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/;
  
      window.fetch = async function(input, init) {
        let url = typeof input === 'string' ? input : input.url;
        const response = await originalFetch.apply(this, arguments);
  
        if (targetRegex.test(url)) {
          try {
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();
            if (data.status != "draft") {
              ReplayAnswer(url, data);
            }
          } catch (err) {
            console.error('Erro ao processar a resposta JSON:', err);
          }
        }
  
        return response;
      };
  
      async function ReplayAnswer(url, data) {
        await responderCorretamente(await pegarRespostas(data.id, data.task_id), data.id, data.task_id);
        const oldTitle = document.title;
        document.title = "Ryan <3";
        setTimeout(() => {
          document.title = oldTitle;
        }, 2000);
      }
    });
  
  })();
  
