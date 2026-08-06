FoxTech — маркетплейс сучасної техніки на Django + Tailwind CSS.

## Можливості
- Каталог товарів з фільтрами та пошуком
- Детальна сторінка товару
- Авторизація та реєстрація користувачів
- Адмінпанель для управління товарами та категоріями
- Адаптивний дизайн з підтримкою української мови
- Власні заставки для товарів без зображень
- Кешування категорій для швидкої роботи каталогу
- Оптимізована завантаження сторінок (lazy loading, preconnect, View Transitions API)

## Технології
- Python 3.13
- Django 6.0.8
- SQLite (розробка) / PostgreSQL (продакшн)
- Tailwind CSS 3
- WhiteNoise
- dj-database-url

## Вимоги
- Python 3.10+
- pip
- Віртуальне середовище (рекомендується)

## Встановлення

1. Клонуйте репозиторій:
   git clone https://github.com/VolodymyrMishchenko98/FoxTech.git
   cd FoxTech/foxtech

2. Створіть віртуальне середовище:
   python -m venv .venv

3. Активуйте середовище:
   - Windows: .venv\Scripts\activate
   - Linux/macOS: source .venv/bin/activate

4. Встановіть залежності:
   pip install -r requirements.txt

5. Застосуйте міграції:
   python manage.py migrate

6. Створіть суперкористувача:
   python manage.py createsuperuser

7. Запустіть сервер:
   python manage.py runserver

8. Відкрийте в браузері:
   http://127.0.0.1:8000/

## Структура проєкту

foxtech/
  foxtech/           - налаштування проекту (settings, urls, wsgi)
  store/             - додаток каталогу товарів
  accounts/          - додаток авторизації та профілів
  templates/         - шаблони HTML
  static/            - статичні файли (CSS, JS, зображення)
  media/             - завантажені користувачами файли
  requirements.txt   - залежності Python

## Документація

- Адмінпанель: http://127.0.0.1:8000/admin/
- Деталі проєкту дивіться у коментарях у коді

## Ліцензія

Проєкт створений для навчальних цілей.
