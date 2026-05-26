# Casos de Uso — Phishing Detector

## Diagrama Geral

```mermaid
flowchart LR
    subgraph Atores_Externos["Serviços Externos"]
        GSB(["Google Safe Browsing"])
        VT(["VirusTotal"])
        PT(["PhishTank"])
        UH(["URLhaus"])
    end

    subgraph Sistema["Sistema — Phishing Detector"]
        UC1("Verificar URL")
        UC2("Analisar caracteres suspeitos na URL")
        UC3("Consultar blacklists externas")
        UC4("Exibir resultado de análise")
        UC5("Exibir alerta de perigo")
        UC6("Exibir orientações de segurança")
    end

    subgraph Libs["Bibliotecas Locais"]
        DNS(["dnstwist"])
        TLD(["tldextract"])
    end

    Usuario(["Usuário"])

    Usuario -->|"inicia"| UC1

    UC1 -->|"<<inclui>>"| UC2
    UC1 -->|"<<inclui>>"| UC3
    UC1 -->|"<<inclui>>"| UC4

    UC4 -->|"<<estende>> quando suspeito"| UC5
    UC5 -->|"<<inclui>>"| UC6

    UC2 --> DNS
    UC2 --> TLD
    UC3 --> GSB
    UC3 --> VT
    UC3 --> PT
    UC3 --> UH
```

---

## UC01 — Verificar URL

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend
    participant B as Backend (Flask)
    participant A as Analisador de URL
    participant API as APIs Externas

    U->>F: Cola ou digita URL
    F->>B: POST /verificar {url}
    B->>A: analisa_url(url)
    A-->>B: resultado local (caracteres suspeitos, domínio, HTTPS)
    B->>API: consulta Google Safe Browsing
    B->>API: consulta VirusTotal
    API-->>B: veredictos externos
    B-->>F: {status: "perigoso|suspeito|seguro", detalhes}
    F-->>U: Exibe resultado com cor e ícone
    alt URL suspeita ou perigosa
        F-->>U: Exibe alerta + orientações de segurança
    end
```

---

## UC02 — Analisar Caracteres Suspeitos na URL

```mermaid
flowchart TD
    A([URL recebida]) --> P[tldextract: separar\nsubdomínio / domínio / sufixo]
    P --> B{dnstwist detecta\nhomóglifos ou\nletras trocadas?}
    B -->|Sim| C[Marcar como suspeito]
    B -->|Não| D{Marca conhecida\nno subdomínio mas\nnão no domínio registrado?}
    D -->|Sim| C
    D -->|Não| E{Levenshtein distância ≤ 2\ncontra domínios legítimos?}
    E -->|Sim| C
    E -->|Não| F{Usa HTTPS?}
    F -->|Não| G[Marcar como alerta]
    F -->|Sim| H([URL passa análise local])
    C --> I([Retornar risco detectado])
    G --> I
```

---

## UC03 — Consultar Blacklists Externas

```mermaid
sequenceDiagram
    participant B as Backend (Flask)
    participant GSB as Google Safe Browsing
    participant VT as VirusTotal
    participant PT as PhishTank
    participant UH as URLhaus

    B->>GSB: threatMatches.find {url}
    GSB-->>B: [] vazio = segura / lista de ameaças = perigosa

    B->>VT: GET /urls/{id}
    VT-->>B: {malicious, suspicious, harmless, undetected}

    B->>PT: POST /checkurl/ {url, app_key}
    PT-->>B: {in_database, verified, phish_detail_url}

    B->>UH: POST /v1/url/ {url}
    UH-->>B: {query_status: "is_reporting" | "no_results"}

    B->>B: consolida veredictos (qualquer positivo = perigoso)
    B-->>B: retorna status final
```

---

## UC04 — Exibir Resultado de Análise

```mermaid
stateDiagram-v2
    [*] --> Analisando

    Analisando --> Seguro : nenhuma ameaça detectada
    Analisando --> Suspeito : sinais fracos ou incertos
    Analisando --> Perigoso : blacklist ou múltiplos sinais

    Seguro --> [*] : exibe badge verde
    Suspeito --> ExibeAlerta : exibe badge amarelo
    Perigoso --> ExibeAlerta : exibe badge vermelho

    ExibeAlerta --> ExibeOrientacoes : inclui orientações
    ExibeOrientacoes --> [*]
```

---

## UC05 — Exibir Alerta e Orientações de Segurança

```mermaid
flowchart TD
    A([URL marcada como suspeita/perigosa]) --> B[Exibir mensagem de risco clara]
    B --> C[Explicar por que é perigosa]
    C --> D{Tipo de risco}
    D -->|Phishing de banco| E[Orientar: ligue para o banco]
    D -->|Loja falsa| F[Orientar: verifique CNPJ no site oficial]
    D -->|Golpe de urgência| G[Orientar: não clique, não preencha dados]
    E & F & G --> H([Fim do fluxo de alerta])
```
