import flask
import requests
import os

app = flask.Flask(__name__, static_folder='./static', template_folder='./templates')

GSB_API_KEY = os.getenv('GSB_API_KEY', '')
VT_API_KEY  = os.getenv('VT_API_KEY', '')



def getGSB(url):
    if not GSB_API_KEY:
        return {'status': 'warn', 'detail': 'sem chave de API'}
    try:
        payload = {
            'client': {'clientId': 'phising-checker', 'clientVersion': '1.0'},
            'threatInfo': {
                'threatTypes': ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
                'platformTypes': ['ANY_PLATFORM'],
                'threatEntryTypes': ['URL'],
                'threatEntries': [{'url': url}],
            },
        }
        r = requests.post(
            f'https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GSB_API_KEY}',
            json=payload,
            timeout=5,
        )
        r.raise_for_status()
        data = r.json()
        if data.get('matches'):
            return {'status': 'bad', 'detail': 'phishing detectado'}
        return {'status': 'ok', 'detail': 'sem ameaças'}
    except requests.exceptions.RequestException:
        return {'status': 'warn', 'detail': 'erro ao consultar'}


def getVT(url):
    if not VT_API_KEY:
        return {'status': 'warn', 'detail': 'sem chave de API'}
    headers = {'x-apikey': VT_API_KEY}
    try:
        # submit URL
        r = requests.post(
            'https://www.virustotal.com/api/v3/urls',
            headers=headers,
            data={'url': url},
            timeout=10,
        )
        r.raise_for_status()
        analysis_id = r.json()['data']['id']

        # get analysis result
        r2 = requests.get(
            f'https://www.virustotal.com/api/v3/analyses/{analysis_id}',
            headers=headers,
            timeout=10,
        )
        r2.raise_for_status()
        stats = r2.json()['data']['attributes']['stats']
        malicious  = stats.get('malicious', 0)
        suspicious = stats.get('suspicious', 0)
        total = sum(stats.values()) or 1

        if malicious > 0:
            return {'status': 'bad',  'detail': f'{malicious}/{total} engines'}
        if suspicious > 0:
            return {'status': 'warn', 'detail': f'{suspicious}/{total} engines'}
        return {'status': 'ok', 'detail': f'0/{total} engines'}
    except requests.exceptions.RequestException:
        return {'status': 'warn', 'detail': 'erro ao consultar'}




def getURLHaus(url):
    try:
        r = requests.post(
            'https://urlhaus-api.abuse.ch/v1/url/',
            data={'url': url},
            headers={'User-Agent': 'phishing-checker/1.0'},
            timeout=8,
        )
        data = r.json()
        query_status = data.get('query_status', '')
        if query_status == 'blacklisted':
            return {'status': 'bad', 'detail': 'na lista negra'}
        return {'status': 'ok', 'detail': 'não encontrado'}
    except Exception as e:
        print(f'[URLhaus] {e}')
        return {'status': 'warn', 'detail': 'erro ao consultar'}


@app.route('/')
def index():
    return flask.render_template('index.html')


@app.route('/verificar', methods=['POST'])
def verify():
    url = flask.request.form.get('url', '').strip()
    if not url:
        return flask.jsonify({'error': 'url obrigatória'}), 400

    results = {
        'gsb':       getGSB(url),
        'vt':        getVT(url),
        'urlhaus':   getURLHaus(url),

    }
    return flask.jsonify(results)


if __name__ == '__main__':
    app.run(debug=True)
