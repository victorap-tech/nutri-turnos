import requests

def enviar_telegram(bot_token, chat_id, mensaje):
    if not bot_token or not chat_id:
        return False
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        resp = requests.post(
            url,
            json={"chat_id": chat_id, "text": mensaje, "parse_mode": "HTML"},
            timeout=5
        )
        return resp.ok
    except Exception as e:
        print(f"[Telegram error] {e}")
        return False
