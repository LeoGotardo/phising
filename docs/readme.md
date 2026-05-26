# Phishing Detector

Sistema web para verificação de URLs suspeitas, com análise local e consulta a múltiplas blacklists externas.

---

## Visão Geral

```mermaid
mindmap
  root((Phishing Detector))
    Usuário
      Verificar URL
    Sistema
      Analisar caracteres suspeitos
      Consultar blacklists externas
      Exibir resultado com badge de risco
      Exibir alerta e orientações
    APIs Externas
      Google Safe Browsing
      VirusTotal
      PhishTank
      URLhaus
    Bibliotecas Locais
      dnstwist
      tldextract
```

---

## Arquitetura

```mermaid
flowchart LR
    subgraph Backend["Backend — Flask (Python)"]
        direction TB
        AN["Analisador de URL"]
        AG["Agregador de Veredictos"]
    end

    subgraph Analise_Local["Análise Local"]
        DNS["dnstwist\npermutações e homóglifos"]
        TLD["tldextract\nparse de domínio"]
        LEV["Levenshtein\ndistância de edição"]
    end

    subgraph APIs["APIs Externas"]
        GSB["Google Safe Browsing\nkey obrigatória · grátis"]
        VT["VirusTotal\nkey obrigatória · grátis"]
        PT["PhishTank\nkey obrigatória · grátis"]
        UH["URLhaus\nsem key · grátis"]
    end

    subgraph Frontend["Frontend — HTML/CSS/JS"]
        UI["Interface de Verificação"]
        AL["Exibição de Alertas"]
    end

    UI -->|"POST /verificar"| AN
    AN --> DNS
    AN --> TLD
    AN --> LEV
    AN -->|"consultas paralelas"| GSB
    AN -->|"consultas paralelas"| VT
    AN -->|"consultas paralelas"| PT
    AN -->|"consultas paralelas"| UH
    AN --> AG
    AG -->|"status + detalhes"| UI
    AG -->|"quando suspeito/perigoso"| AL
```

---

## Dependências Python

| Pacote | Uso |
|---|---|
| `flask` | framework web |
| `dnstwist` | detecção de domínios parecidos e homóglifos |
| `tldextract` | parse de subdomínio / domínio / sufixo |
| `python-Levenshtein` | distância de edição entre domínios |
| `requests` | chamadas às APIs externas |

```
pip install flask dnstwist tldextract python-Levenshtein requests
```

---

## APIs Externas

| API | Endpoint principal | Autenticação |
|---|---|---|
| Google Safe Browsing | `POST /v4/threatMatches:find` | API key (Google Cloud) |
| VirusTotal | `GET /api/v3/urls/{id}` | API key (VirusTotal) |
| PhishTank | `POST https://checkurl.phishtank.com/checkurl/` | API key (PhishTank) |
| URLhaus | `POST https://urlhaus-api.abuse.ch/v1/url/` | Sem autenticação |

---

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `casos-de-uso.md` | Diagramas de casos de uso (UC01–UC05) |
| `design-system.md` | Paleta, tipografia, componentes e wireframes |
