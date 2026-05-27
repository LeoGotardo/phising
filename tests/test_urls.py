"""
Testa o endpoint /verificar com URLs variadas.
Roda com: python tests/test_urls.py
Requer o servidor Flask rodando em localhost:5000.
"""
import sys
import requests

BASE = 'http://localhost:5000'

CASES = [
    # (descrição, url, fontes_esperadas_bad, fontes_esperadas_warn_ou_bad)
    # --- Seguras: nenhuma fonte deve retornar bad ---
    ('Google legítimo',          'https://www.google.com',                    [], []),
    ('Nubank legítimo',          'https://www.nubank.com.br',                 [], []),
    ('Mercado Livre legítimo',   'https://www.mercadolivre.com.br',           [], []),
    ('GitHub legítimo',          'https://www.github.com',                    [], []),
    ('example.com',              'https://example.com',                       [], []),

    # --- GSB test (requer GSB_API_KEY) ---
    ('GSB malware test',         'http://malware.testing.google.test/testing/malware/', ['gsb'], []),

    # --- VT/URLhaus: domínio .test não resolve, espera warn ---
    ('domínio .test',            'http://qualquer.test/',                     [], ['vt']),
]

GREEN  = '\033[92m'
YELLOW = '\033[93m'
RED    = '\033[91m'
RESET  = '\033[0m'
BOLD   = '\033[1m'

STATUS_EMOJI = {'ok': '✓', 'warn': '~', 'bad': '✗'}
STATUS_COLOR = {'ok': GREEN, 'warn': YELLOW, 'bad': RED}

def run():
    passed = failed = 0

    for desc, url, exp_bad, exp_warn in CASES:
        try:
            r = requests.post(f'{BASE}/verificar', data={'url': url}, timeout=60)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f'{RED}[ERRO]{RESET} {desc}: {e}')
            failed += 1
            continue

        print(f'\n{BOLD}{desc}{RESET}')
        print(f'  URL: {url}')

        case_ok = True
        for key, result in data.items():
            st    = result.get('status', '?')
            det   = result.get('detail', '')
            color = STATUS_COLOR.get(st, RESET)
            emoji = STATUS_EMOJI.get(st, '?')
            print(f'  {color}{emoji} {key:<10}{RESET} {st:<6}  {det}')

            if key in exp_bad and st != 'bad':
                print(f'    {RED}⚠ esperado bad para {key}, recebeu {st}{RESET}')
                case_ok = False
            if key in exp_warn and st not in ('warn', 'bad'):
                print(f'    {RED}⚠ esperado warn para {key}, recebeu {st}{RESET}')
                case_ok = False

        if case_ok:
            passed += 1
            print(f'  {GREEN}PASS{RESET}')
        else:
            failed += 1
            print(f'  {RED}FAIL{RESET}')

    total = passed + failed
    color = GREEN if failed == 0 else RED
    print(f'\n{BOLD}{color}{passed}/{total} testes passaram{RESET}')
    sys.exit(0 if failed == 0 else 1)

if __name__ == '__main__':
    run()
