# FoxTech

Інтернет-магазин електроніки на Django з динамічним кошиком, промокодами, міні-грою
та рольовим чатом підтримки (клієнт ↔ менеджер).

## Стек

- Python 3.13+
- Django 6.x
- Tailwind CSS (через CDN)
- SQLite (за замовчуванням; легко замінити на PostgreSQL/MySQL)
- Чистий JS + `fetch` для динамічних частин (кошик, чат) — без DRF

## Додатки

- `accounts` — реєстрація, профіль, ролі користувачів (`user` / `manager`)
- `store` — товари, каталог, кошик (для авторизованих і гостей), промокоди, міні-гра
- `chat` — треади «клієнт → менеджер», вхідні для менеджера, real-time оновлення

## Швидкий старт

```bash
git clone https://github.com/VolodymyrMishchenko98/FoxTech.git
cd FoxTech/foxtech

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser   # опціонально
python manage.py runserver
```

Відкрийте http://127.0.0.1:8000/

## Змінні середовища

- `SECRET_KEY` — обов'язково задайте в продакшені (у `settings.py` є небезпечний
  запасний варіант, не використовуйте його публічно).
- `ALLOWED_HOSTS` — налаштуйте під свій домен/хост.

## Ліцензія

Проєкт поширюється під ліцензією MIT — див. файл `LICENSE`.
