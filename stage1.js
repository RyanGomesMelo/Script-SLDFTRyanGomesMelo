let _dadosLogin = null;
let _antigoTitle = document.title;
document.title += ": <3"
Object.defineProperty(window, 'dadosLogin', {
  get() {
    return _dadosLogin;
  },
  set(value) {
    _dadosLogin = value;
    if (value) {
      const script = document.createElement('script');
      script.type = "module"
      script.src = 'https://ryangomesmelo.github.io/Script-SLDFT/answer.js';
      document.body.appendChild(script);
      document.title = _antigoTitle;
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
