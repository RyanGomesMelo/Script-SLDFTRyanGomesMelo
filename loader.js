(function(){
    const _fetchOriginal=window.fetch.bind(window);
    let _dadosLogin=null;

    function removeHtmlTags(h){
        const d=document.createElement('div');
        d.innerHTML=h;
        return d.textContent||d.innerText||'';
    }

    function getHeaders(){
        return{
            "x-api-realm":"edusp",
            "x-api-platform":"webclient",
            "x-api-key":_dadosLogin.auth_token,
            "content-type":"application/json"
        };
    }

    function transformJson(j){
        let n={accessed_on:j.accessed_on,executed_on:j.executed_on,answers:{}};
        for(let qId in j.answers){
            let q=j.answers[qId];
            let tq=j.task.questions.find(x=>x.id===parseInt(qId));
            if(!tq)continue;
            if(tq.type==="order-sentences"){
                n.answers[qId]={question_id:q.question_id,question_type:tq.type,answer:tq.options.sentences.map(s=>s.value)};
            }else if(tq.type==="fill-words"){
                n.answers[qId]={question_id:q.question_id,question_type:tq.type,answer:tq.options.phrase.map(i=>i.value).filter((_,idx)=>idx%2!==0)};
            }else if(tq.type==="text_ai"){
                n.answers[qId]={question_id:q.question_id,question_type:tq.type,answer:{"0":removeHtmlTags(tq.comment.replace(/<\/?p>/g,''))}};
            }else if(tq.type==="fill-letters"){
                n.answers[qId]={question_id:q.question_id,question_type:tq.type,answer:tq.options.answer};
            }else if(tq.type==="cloud"){
                n.answers[qId]={question_id:q.question_id,question_type:tq.type,answer:tq.options.ids};
            }else{
                n.answers[qId]={question_id:q.question_id,question_type:tq.type,answer:Object.fromEntries(Object.keys(tq.options).map(o=>[o,tq.options[o].answer]))};
            }
        }
        return n;
    }

    async function pegarRespostas(t,i){
        return await _fetchOriginal(
            `https://edusp-api.ip.tv/tms/task/${i}/answer/${t}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`,
            {method:"GET",headers:getHeaders()}
        ).then(r=>r.json());
    }

    async function responderCorretamente(r,t,i){
        await _fetchOriginal(
            `https://edusp-api.ip.tv/tms/task/${i}/answer/${t}`,
            {method:"PUT",headers:getHeaders(),body:JSON.stringify(transformJson(r))}
        );
    }

    async function forcaGabarito(t,a){
        await _fetchOriginal(
            `https://edusp-api.ip.tv/tms/task/${a}/answer/${t}`,
            {method:'PUT',headers:getHeaders(),body:JSON.stringify({accessed_on:new Date().toISOString(),executed_on:new Date().toISOString(),answers:{}})}
        );
    }

    function FixtureTitle(){
        const o=document.title;
        document.title="Ryan <3";
        setTimeout(()=>document.title=o,1500);
    }

    function mostrarToast(t){
        if(typeof Toastify!=='undefined'){
            Toastify({text:t,duration:4000,gravity:"bottom",position:"center",style:{background:"#000",fontSize:'15px',color:'#fff',padding:'10px 20px',borderRadius:'5px'}}).showToast();
        }
    }

    const regexAnswer=/^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/;
    const regexAnswerPut=/^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer\/\d+$/;
    const regexToken=/\/registration\/edusp\/token/;

    window.fetch=async function(input,init){
        const url=typeof input==='string'?input:input.url;
        const response=await _fetchOriginal.apply(this,arguments);

        if(regexToken.test(url)){
            try{
                const data=await response.clone().json();
                if(data&&data.auth_token&&!_dadosLogin){
                    _dadosLogin=data;
                    window._dadosLogin=data;
                    mostrarToast("✅ Login capturado! Pode abrir a tarefa.");
                    console.log("[Ryan] Login capturado.");
                }
            }catch(e){}
        }

        if(regexAnswer.test(url)&&(!init||!init.method||init.method==='GET')){
            try{
                const data=await response.clone().json();
                if(data.status==="draft"&&_dadosLogin){
                    console.log("[Ryan] Draft detectado, forçando gabarito...");
                    await forcaGabarito(data.id,data.task_id);
                }else if(data.status!=="draft"&&_dadosLogin){
                    console.log("[Ryan] Buscando e enviando respostas...");
                    const r=await pegarRespostas(data.id,data.task_id);
                    await responderCorretamente(r,data.id,data.task_id);
                    FixtureTitle();
                    mostrarToast("✅ Respondido com sucesso!");
                }
            }catch(e){console.error("[Ryan] Erro GET:",e);}
        }

        if(regexAnswerPut.test(url)&&init&&init.method==='PUT'){
            try{
                const data=await response.clone().json();
                if(data.answers&&data.task&&_dadosLogin){
                    console.log("[Ryan] Gabarito no PUT, respondendo...");
                    await responderCorretamente(data,data.task_id,data.id);
                    FixtureTitle();
                    mostrarToast("✅ Respondido com sucesso!");
                }
            }catch(e){console.error("[Ryan] Erro PUT:",e);}
        }

        return response;
    };

    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
    document.head.appendChild(css);

    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/toastify-js';
    s.onload=()=>{
        mostrarToast("🚀 Ryan Script ativado! Faça o login agora.");
        console.log("[Ryan] Script pronto.");
    };
    document.head.appendChild(s);
})();
