async function buscarStatusAtual() {
    try {
        const resposta = await fetch('/api/leituras/atual');

        if (!resposta.ok) {
            throw new Error('Erro ao buscar os dados');
        }

        const dado = await resposta.json();

        const label = document.getElementById('statusTexto');
        const ponteiro = document.getElementById('ponteiro');

        const zonas = {
            baixo: document.getElementById('zonaBaixo'),
            medio: document.getElementById('zonaMedio'),
            alto: document.getElementById('zonaAlto'),
            critico: document.getElementById('zonaCritico')
        };

        const bolinha = document.getElementById('bolinhaStatus');
        const textoConexao = document.getElementById('textoConexao');

        if (!dado) {
            label.innerText = 'Nenhuma leitura ainda';
            label.classList.remove('pulso-critico');
            bolinha.className = 'bolinha offline';
            textoConexao.innerText = 'ESP32 Offline';
            return;
        }

        const ANGULOS = { baixo: -67.5, medio: -22.5, alto: 22.5, critico: 67.5 };
        const CORES_TEXTO = { baixo: '#4ade80', medio: '#fde047', alto: '#fb923c', critico: '#f87171' };

        label.innerText = dado.nivel.toUpperCase();
        label.style.color = CORES_TEXTO[dado.nivel] || 'white';

        const angulo = ANGULOS[dado.nivel] ?? 0;
        ponteiro.style.transform = `rotate(${angulo}deg)`;

        Object.keys(zonas).forEach(function (nome) {
            if (nome === dado.nivel) {
                zonas[nome].classList.remove('zona-inativa');
            } else {
                zonas[nome].classList.add('zona-inativa');
            }
        });

        label.classList.toggle('pulso-critico', dado.nivel === 'critico');

        // Metadados
        document.getElementById('metaUltimaAtualizacao').innerText = dado.criado_em;

        // Indicador de conexão (Online/Offline baseado em quão recente foi a última leitura)
        const agora = new Date();
        const ultimaLeitura = new Date(dado.criado_em.replace(' ', 'T'));
        const segundosDesdeUltimaLeitura = (agora - ultimaLeitura) / 1000;

        if (segundosDesdeUltimaLeitura < 20) {
            bolinha.className = 'bolinha online';
            textoConexao.innerText = 'ESP32 Online';
        } else {
            bolinha.className = 'bolinha offline';
            textoConexao.innerText = 'ESP32 Offline';
        }

    } catch (erro) {
        console.error('Erro:', erro);
        document.getElementById('statusTexto').innerText = 'Erro ao carregar dados';
    }
}

let grafico;

function criarGrafico() {
    const ctx = document.getElementById('graficoNivel').getContext('2d');

    grafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Nível',
                data: [],
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                pointBackgroundColor: '#e2e8f0',
                pointBorderColor: '#7c3aed',
                pointRadius: 4,
                borderWidth: 2,
                stepped: true,
                fill: true
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#e2e8f0' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' }
                },
                y: {
                    min: 0,
                    max: 3,
                    ticks: {
                        stepSize: 1,
                        color: '#e2e8f0',
                        callback: function (valor) {
                            const NOMES = ['Baixo', 'Médio', 'Alto', 'Crítico'];
                            return NOMES[valor];
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' }
                }
            }
        }
    });
}

const NIVEL_PARA_NUMERO = { baixo: 0, medio: 1, alto: 2, critico: 3 };

async function buscarHistorico() {
    const resposta = await fetch('/api/leituras/historico');
    const dados = await resposta.json();

    const valores = dados.map(d => NIVEL_PARA_NUMERO[d.nivel]);

    grafico.data.labels = dados.map(d => d.criado_em);
    grafico.data.datasets[0].data = valores;
    grafico.update();

    atualizarEstatisticas(valores);
}

function atualizarEstatisticas(valores) {
    const NOMES = ['Baixo', 'Médio', 'Alto', 'Crítico'];

    if (valores.length === 0) {
        document.getElementById('statMin').innerText = '--';
        document.getElementById('statMax').innerText = '--';
        document.getElementById('statMedia').innerText = '--';
        return;
    }

    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const soma = valores.reduce((total, v) => total + v, 0);
    const media = soma / valores.length;

    document.getElementById('statMin').innerText = NOMES[minimo];
    document.getElementById('statMax').innerText = NOMES[maximo];
    document.getElementById('statMedia').innerText = media.toFixed(1);
}

// Chamadas que efetivamente iniciam tudo:
buscarStatusAtual();
setInterval(buscarStatusAtual, 2000);

criarGrafico();
buscarHistorico();
setInterval(buscarHistorico, 2000);
