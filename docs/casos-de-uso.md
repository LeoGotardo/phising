# Casos de Uso — Phishing Detector

## Diagrama Geral

```mermaid
flowchart LR
    subgraph Atores_Externos["Serviços Externos"]
        GSB(["Google Safe Browsing"])
        VT(["VirusTotal"])
        UH(["URLhaus"])
    end

    subgraph Sistema["Sistema — Phishing Detector"]
        UC1("Verificar URL")
        UC2("Análise local no browser")
        UC3("Consultar blacklists externas")
        UC4("Exibir resultado de análise")
        UC5("Exibir alerta de perigo")
        UC6("Exibir orientações de segurança")
    end

    Usuario(["Usuário"])

    Usuario -->|"inicia"| UC1

    UC1 -->|"<<inclui>>"| UC2
    UC1 -->|"<<inclui>>"| UC3
    UC1 -->|"<<inclui>>"| UC4

    UC4 -->|"<<estende>> quando suspeito"| UC5
    UC5 -->|"<<inclui>>"| UC6

    UC3 --> GSB
    UC3 --> VT
    UC3 --> UH
```

---

## UC01 — Verificar URL

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend (JS)
    participant B as Backend (Flask)
    participant API as APIs Externas

    U->>F: Cola ou digita URL
    F->>F: Análise local (heurísticas de domínio)
    F->>B: POST /verificar {url}
    B->>API: consulta Google Safe Browsing
    B->>API: consulta VirusTotal
    B->>API: consulta URLhaus
    API-->>B: veredictos externos
    B-->>F: {gsb, vt, urlhaus}
    F-->>U: Exibe checklist com resultado de cada fonte
    alt URL suspeita ou perigosa
        F-->>U: Exibe alerta + orientações de segurança
    end
```

---

## UC02 — Análise Local no Browser

Executada em JavaScript, sem round-trip ao backend.

```mermaid
flowchart TD
    A([URL recebida]) --> H[Extrair hostname]
    H --> DN[Normalizar dígitos\n0→o · 1→l · 3→e · 4→a · 5→s · 8→b]
    DN --> B{Marca conhecida\nno subdomínio mas\nnão no domínio registrado?}
    B -->|Sim| C[status: bad\n'imita marca']
    B -->|Não| D{Dígito normalizado\ncontém marca?}
    D -->|Sim| C
    D -->|Não| E{Levenshtein ≤ 1\ncontra marca conhecida?}
    E -->|Sim| G[status: warn\n'similar a marca']
    E -->|Não| F([status: ok\n'domínio legítimo'])
    C --> I([Retornar resultado local])
    G --> I
```

Marcas monitoradas: bradesco, itau, santander, caixa, bb, nubank, mercadolivre, amazon, paypal, netflix, ifood, correios.

---

## UC03 — Consultar Blacklists Externas

```mermaid
sequenceDiagram
    participant B as Backend (Flask)
    participant GSB as Google Safe Browsing
    participant VT as VirusTotal
    participant UH as URLhaus

    B->>GSB: POST threatMatches:find {url}
    GSB-->>B: {} vazio = segura / matches = perigosa

    B->>VT: POST /urls {url}
    VT-->>B: {data.id}
    B->>VT: GET /analyses/{id}
    VT-->>B: {stats: malicious, suspicious, harmless, undetected}

    B->>UH: POST /v1/url/ {url}
    UH-->>B: {query_status: "blacklisted" | outro}

    B-->>B: retorna {gsb, vt, urlhaus} com status ok/warn/bad
```

Sem chave configurada para GSB ou VT, o backend retorna `warn` com mensagem `'sem chave de API'`.

---

## UC04 — Exibir Resultado de Análise

```mermaid
stateDiagram-v2
    [*] --> Analisando

    Analisando --> Seguro : nenhuma fonte retornou bad/warn
    Analisando --> Suspeito : pelo menos uma warn, nenhuma bad
    Analisando --> Perigoso : pelo menos uma bad

    Seguro --> [*] : exibe badge verde
    Suspeito --> ExibeAlerta : exibe badge amarelo
    Perigoso --> ExibeAlerta : exibe badge vermelho

    ExibeAlerta --> ExibeOrientacoes : inclui orientações
    ExibeOrientacoes --> [*]
```

Lógica de agregação (frontend):
- qualquer `bad` → **danger**
- qualquer `warn`, sem `bad` → **suspicious**
- todos `ok` → **safe**

---

## UC05 — Exibir Alerta e Orientações de Segurança

```mermaid
flowchart TD
    A([URL marcada como suspeita/perigosa]) --> B[Exibir banner de risco]
    B --> C{Nível de risco}
    C -->|danger| D["Não insira senha, CPF ou dados bancários\nFeche a aba imediatamente\nSe já inseriu dados, contate seu banco"]
    C -->|suspicious| E["Não insira dados pessoais ou financeiros\nConfira o endereço com atenção\nEm dúvida, use o aplicativo oficial"]
    D & E --> F([Fim do fluxo de alerta])
```