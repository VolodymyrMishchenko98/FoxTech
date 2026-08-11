#!/usr/bin/env bash
set -e
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate

python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
username = '${ADMIN_USER:-adminost}'
email = '${ADMIN_EMAIL:-admin@example.com}'
password = '${ADMIN_PASSWORD:-}'
if password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
"
