# Phishing Detector

Sistema web para verificação de URLs suspeitas, com análise local no browser e consulta a múltiplas blacklists externas.

---

## Visão Geral

```mermaid
mindmap
  root((Phishing Detector))
    Usuário
      Verificar URL
    Frontend (JS)
      Análise local de domínio
      Normalização de dígitos
      Distância de Levenshtein
      Verificação de marcas conhecidas
    Backend (Flask)
      Consultar blacklists externas
      Agregar veredictos
    APIs Externas
      Google Safe Browsing
      VirusTotal
      URLhaus
```

---

## Arquitetura

```mermaid
flowchart LR
    subgraph Frontend["Frontend — HTML/CSS/JS"]
        UI["Interface de Verificação"]
        LA["Análise Local\n(Levenshtein · digit norm · brands)"]
        AL["Exibição de Alertas"]
    end

    subgraph Backend["Backend — Flask (Python)"]
        AG["Agregador de Requisições"]
    end

    subgraph APIs["APIs Externas"]
        GSB["Google Safe Browsing\nkey obrigatória · grátis"]
        VT["VirusTotal\nkey obrigatória · grátis"]
        UH["URLhaus\nsem key · grátis"]
    end

    UI -->|"análise síncrona"| LA
    UI -->|"POST /verificar"| AG
    AG -->|"consultas"| GSB
    AG -->|"consultas"| VT
    AG -->|"consultas"| UH
    AG -->|"status + detalhes"| UI
    LA -->|"resultado local"| UI
    UI -->|"quando suspeito/perigoso"| AL
```

---

## Dependências Python

| Pacote | Uso |
|---|---|
| `flask` | framework web |
| `requests` | chamadas às APIs externas |

```
pip install flask requests
```

---

## APIs Externas

| API | Endpoint principal | Autenticação |
|---|---|---|
| Google Safe Browsing | `POST /v4/threatMatches:find` | API key (Google Cloud) |
| VirusTotal | `POST /api/v3/urls` + `GET /api/v3/analyses/{id}` | API key (VirusTotal) |
| URLhaus | `POST https://urlhaus-api.abuse.ch/v1/url/` | Sem autenticação |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GSB_API_KEY` | Não | Chave Google Safe Browsing; sem ela retorna `warn` |
| `VT_API_KEY` | Não | Chave VirusTotal; sem ela retorna `warn` |

---

## Sites para Testar a Detecção

### Seguro — deve retornar badge verde

| URL | Por quê usar |
|---|---|
| `https://www.google.com` | domínio de marca legítima |
| `https://www.nubank.com.br` | banco brasileiro real (testa brand list) |
| `https://www.mercadolivre.com.br` | e-commerce real (testa brand list) |

### Análise local — deve acionar heurísticas JS

| URL (exemplo) | Heurística acionada |
|---|---|
| `http://bradesc0.com.br` | dígito `0→o` imita "bradesco" → **bad** |
| `http://itau.conta-segura.com` | marca no subdomínio, domínio diferente → **bad** |
| `http://nubank-suporte.com` | Levenshtein próximo de "nubank" → **warn** |

> Essas URLs são **fictícias** — use apenas para ver a análise local funcionar.
> Não acesse nem cadastre dados nelas caso existam.

### Blacklists externas — URLs de teste oficiais

| URL | Fonte | Resultado esperado |
|---|---|---|
| `http://malware.testing.google.test/testing/malware/` | Google Safe Browsing | GSB → **bad** |
| `http://phishing.testing.google.test/testing/phishing/` | Google Safe Browsing | GSB → **bad** |
| `http://unwanted.testing.google.test/testing/unwanted/` | Google Safe Browsing | GSB → **bad** |

> URLs acima são domínios de teste oficiais do Google, inofensivos e criados exatamente para validar integrações com a Safe Browsing API.

### Encontrar URLs reais de phishing (para testes avançados)

| Recurso | Link | Observação |
|---|---|---|
| URLhaus Browse | `https://urlhaus.abuse.ch/browse/` | Lista pública de URLs maliciosas ativas |
| PhishTank | `https://www.phishtank.com/phish_search.php` | Base de phishing verificado pela comunidade |
| OpenPhish | `https://openphish.com/` | Feed público de phishing em tempo real |

> Use com cuidado: são URLs maliciosas reais. Não abra no browser — apenas copie a URL e cole no detector.

---

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `casos-de-uso.md` | Diagramas de casos de uso (UC01–UC05) |
| `design-system.md` | Paleta, tipografia, componentes e wireframes |
