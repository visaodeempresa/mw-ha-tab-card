#!/usr/bin/env python3
"""Manda o HACS baixar a versão nova e conserta o cache do navegador.

GERADO por IA/tools/mw-devops.sh — não editar à mão.
Fonte canônica: IA/lib/mw-devops/templates/publicar-no-ha.py

Roda no runner da GitHub e fala com o HA pela Nabu Casa (HTTP + WebSocket).
Quem escreve o arquivo em /config/www é o HACS, de dentro da casa — o runner
não tem como, e é isso que mantém a casa sem porta aberta.
"""
import asyncio, json, os, sys, urllib.request
import websockets

URL = os.environ["HA_URL"].rstrip("/")
TOKEN = os.environ["HA_TOKEN"]
VERSAO = (os.environ.get("VERSAO") or "").lstrip("v")
REPO = "visaodeempresa/mw-ha-tab-card"          # dono/repositório no GitHub
NOME = "mw-ha-tab-card"                    # a pasta em /config/www/community
CARD = "mw-tab-card"                    # o arquivo .js, sem extensão
WS = URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/websocket"


async def main():
    nid = 0
    async with websockets.connect(WS, max_size=None) as ws:
        async def call(p, tolerante=False):
            nonlocal nid
            nid += 1
            mine = nid
            await ws.send(json.dumps(dict(p, id=mine)))
            while True:
                m = json.loads(await ws.recv())
                if m.get("id") == mine and m.get("type") == "result":
                    if not m.get("success") and not tolerante:
                        raise SystemExit(f"falhou {p['type']}: {m.get('error')}")
                    return m

        await ws.recv()
        await ws.send(json.dumps({"type": "auth", "access_token": TOKEN}))
        if json.loads(await ws.recv()).get("type") != "auth_ok":
            raise SystemExit("autenticação recusada pelo HA")
        print("· conectado ao HA")

        # 1) HACS baixa a release
        repos = (await call({"type": "hacs/repositories/list"}))["result"]
        meu = next((r for r in repos if r.get("full_name") == REPO), None)
        if not meu:
            await call({"type": "hacs/repositories/add", "repository": REPO, "category": "plugin"})
            repos = (await call({"type": "hacs/repositories/list"}))["result"]
            meu = next((r for r in repos if r.get("full_name") == REPO), None)
        if not meu:
            raise SystemExit("HACS não enxerga o repositório")
        # `available_version` do HACS vem COM o "v" ("v0.1.0"); `VERSAO` vem
        # sem. Sem esta normalização o script monta "vv0.1.0", procura
        # `VERSION = "v0.1.0"` no arquivo e nunca acha — falhando com o
        # componente correto no ar. Visto em 2026-09-09.
        alvo = (VERSAO or meu.get("available_version") or "").lstrip("v")
        print(f"· HACS id={meu['id']} instalada={meu.get('installed_version')} alvo={alvo}")
        # versão explícita contorna o available_version velho em cache logo
        # depois de publicar a release
        await call({"type": "hacs/repository/download", "repository": meu["id"],
                    "version": f"v{alvo}" if alvo else None}, tolerante=True)

        # 2) a URL do recurso carrega a versão: sem isso o navegador serve o
        #    card velho para sempre
        nova = f"/hacsfiles/{NOME}/{CARD}.js?v={alvo or 'x'}"
        achou = False
        for r in (await call({"type": "lovelace/resources"}))["result"]:
            if NOME in r.get("url", ""):
                await call({"type": "lovelace/resources/update", "resource_id": r["id"],
                            "res_type": "module", "url": nova})
                achou = True
        if not achou:
            await call({"type": "lovelace/resources/create", "res_type": "module", "url": nova})
        print("· recurso:", nova)

    # 3) conferência NO DESTINO — o que o servidor entrega, não o que mandei
    req = urllib.request.Request(f"{URL}/hacsfiles/{NOME}/{CARD}.js",
                                 headers={"Authorization": f"Bearer {TOKEN}"})
    corpo = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    # as duas convenções da fábrica: `const VERSION = "x"` e o banner `%c x `
    if alvo and f'VERSION = "{alvo}"' not in corpo and f"%c {alvo} " not in corpo:
        print(f"· ATENÇÃO: o servidor ainda não entrega a v{alvo} (HACS pode estar baixando)")
        sys.exit(1)
    print(f"· VERIFICADO: o HA entrega a v{alvo} ({len(corpo)} bytes)")


asyncio.run(main())
