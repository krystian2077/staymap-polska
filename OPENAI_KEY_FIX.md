# 🔧 Jak uruchomić AI Search — rozwiązanie błędu OPENAI_API_KEY

## ✅ Problem rozwiązany

Klucz **jest w `.env`** i **Django go widzi**. Problem był prawdopodobnie:

1. **Uruchamiłeś serwer z niewłaściwego katalogu**
2. **Zmienna `DJANGO_SETTINGS_MODULE` nie była ustawiona**
3. **Cache Python lub `.pyc`**

## 🚀 Prawidłowy sposób uruchomienia

### Opcja 1: Docker (NAJŁATWIEJ)
```bash
docker-compose up backend frontend
```

### Opcja 2: Lokalnie z PowerShell/CMD

```powershell
# Terminal 1 — Backend
cd D:\staymap-polska\backend
$env:DJANGO_SETTINGS_MODULE="config.settings.development"
$env:PYTHONPATH="D:\staymap-polska\backend"
python manage.py runserver 0.0.0.0:8000

# Terminal 2 — Frontend
cd D:\staymap-polska\frontend
npm run dev

# Otwórz: http://localhost:3000/ai
```

### Opcja 3: Lokalnie z Bash/WSL
```bash
cd /d/staymap-polska/backend
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py runserver 0.0.0.0:8000

# Terminal 2
cd /d/staymap-polska/frontend
npm run dev
```

## ⚠️ KONIECZNIE: Zmień klucz

Klucz w `.env` **wyciekł** w ostatniej rozmowie. MUSISZ:

1. Wejdź na: https://platform.openai.com/account/api-keys
2. Klik **"Delete"** przy starym kluczu (sk-proj-IsPU_5iOMP4-...)
3. Klik **"Create new secret key"**
4. Skopiuj nowy klucz
5. Wklej do `.env`:
   ```dotenv
   OPENAI_API_KEY=sk-proj-NOWY_KLUCZ_TUTAJ
   ```
6. **Uruchom serwer na nowo**

## ✅ Weryfikacja

Po uruchomieniu serwera powinien być log:
```
[Django] Loaded .env from: D:\staymap-polska\.env
```

## 🧪 Test AI Search

1. Wejdź: http://localhost:3000/ai
2. Wpisz: "Domek z sauną dla dwojga na Mazurach"
3. Klik: "Szukaj"
4. Oczekiwane: status zmienia się → pojawią się wyniki + panel czatu

---

**Zrobione**: Poprawiłem ładowanie `.env` w Django, ale klucz **MUSI** być zmieniony!

