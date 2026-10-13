"""Lee el payload RSC (self.__next_f) de una página de metaroad.gg."""
import json, re, urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf8")

def flight(html):
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', html, re.S)
    return "".join(json.loads('"' + c + '"') for c in chunks)

def rows(s):
    """Devuelve {id: valor}. Filas de texto 'id:T<hex>,<texto>' y filas JSON 'id:<json>'."""
    out, i, n = {}, 0, len(s)
    dec = json.JSONDecoder()
    while i < n:
        m = re.compile(r'([0-9a-f]+):').match(s, i)
        if not m:
            j = s.find("\n", i)
            if j < 0: break
            i = j + 1; continue
        rid, i = m.group(1), m.end()
        if s.startswith("T", i):
            k = s.index(",", i)
            ln = int(s[i + 1:k], 16)
            # la longitud es en bytes UTF-8
            b = s[k + 1:k + 1 + ln]
            extra = len(b.encode("utf8")) - ln
            while extra > 0:  # la longitud es en bytes: quita caracteres multibyte de más
                extra -= len(b[-1].encode("utf8")); b = b[:-1]
            out[rid] = b
            i = k + 1 + len(b)
        elif s[i] in "[{\"" or s[i].isdigit() or s.startswith(("null", "true", "false"), i):
            try:
                v, e = dec.raw_decode(s, i)
                out[rid] = v; i = e
            except ValueError:
                j = s.find("\n", i); out[rid] = s[i:j]; i = j + 1
        else:
            j = s.find("\n", i)
            if j < 0: j = n
            out[rid] = s[i:j]; i = j + 1
    return out

def find(obj, pred):
    """Busca recursivamente dicts que cumplan pred."""
    if isinstance(obj, dict):
        if pred(obj): yield obj
        for v in obj.values(): yield from find(v, pred)
    elif isinstance(obj, list):
        for v in obj: yield from find(v, pred)
