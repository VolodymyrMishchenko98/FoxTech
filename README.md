# FoxTech

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.x-092E20?logo=django&logoColor=white)](https://djangoproject.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Open%20Source-success)](https://github.com/VolodymyrMishchenko98/FoxTech)

</div>

FoxTech — це сучасний маркетплейс електроніки та гаджетів, побудований на Django з адаптивним інтерфейсом, динамічним кошиком, промокодами, чатом підтримки та інтерактивною міні-грою.

Цей проєкт створений як демонстрація “продакшн-подібного” e-commerce продукту з сучасним UX і повним циклом покупця: пошук, фільтрація, кошик, оформлення, підтримка та рольовий функціонал.

## ✨ Що входить в проєкт

- Каталог товарів з пошуком та фільтрацією
- Детальна сторінка товару
- Адаптивний дизайн для мобільних, планшетів і десктопів
- Динамічний кошик з оновленням через fetch
- Система промокодів
- Авторизація та реєстрація користувачів
- Ролі: клієнт і менеджер
- Чат підтримки між користувачем і менеджером
- Міні-гра з бонусами для користувача
- Адмінпанель для управління каталогом і користувачами
- Підтримка української мови

## 🧩 Технології

- Python 3.10+
- Django 6.x
- Tailwind CSS 3
- SQLite для локальної розробки
- JavaScript без фреймворків для SPA-частин
- HTML/CSS/Sass-style utility workflow
- WhiteNoise для продакшн-статичних файлів

## 🚀 Швидкий старт

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

Після запуску відкрийте:

https://127.0.0.1:8000/

## 🏗️ Структура проєкту

```text
foxtech/
├── foxtech/             # налаштування проекту (settings, urls, wsgi)
├── store/               # каталог, кошик, промокоди, логіка продажів
├── accounts/            # автентифікація, профіль, ролі
├── chat/                # чат підтримки та повідомлення
├── templates/           # HTML шаблони
├── static/              # CSS, JS, зображення, стилі
├── media/               # файли, завантажені користувачем
├── requirements.txt     # залежності Python
├── manage.py            # entry point Django
├── LICENSE              # MIT license
├── README.md            # документація проєкту
└── db.sqlite3           # база для локального запуску
```

## ⚙️ Змінні середовища

Для продакшену рекомендується налаштувати:

- `SECRET_KEY` — обов'язково в продакшені
- `DEBUG` — `True` для локального запуску, `False` для продакшену
- `ALLOWED_HOSTS` — домени/хости вашого сайту
- `DATABASE_URL` — для PostgreSQL або іншої production БД

> Важливо: не використовуйте інсайдерський `SECRET_KEY` з dev-середовища в продакшені. Для продакшену створіть окремий ключ і не змінюйте його після запуску проекту.

## 🧠 Roadmap

- Покращення checkout flow
- Платіжна інтеграція
- Система відгуків і рейтингу товарів
- Пошук з фільтрацією та сортуванням в реальному часі
- Інтеграція з Telegram / email
- Розширена аналітика продажів для менеджерів

## 🤝 Участь у проєкті

Ласкаво просимо до внесків!

1. Форкніть репозиторій
2. Створіть feature branch
3. Зробіть зміни
4. Відкрий Pull Request

```bash
git checkout -b feature/my-improvement
```

## 📣 Як підтримати

- поставте зірку на GitHub
- залиште issue з ідеями або багами
- запропонуйте покращення в Pull Request
- поділіться проєктом з іншими розробниками

## 📄 Ліцензія

Проєкт поширюється під ліцензією MIT. Див. файл [LICENSE](LICENSE).

## 🌐 GitHub

https://github.com/VolodymyrMishchenko98/FoxTech
