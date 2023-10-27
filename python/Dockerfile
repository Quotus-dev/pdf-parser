# Use an official Python runtime as the base image
FROM python:3.8

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx

RUN apt-get update && apt-get install -y \
    tesseract-ocr

COPY requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

ENV NAME World

CMD ["python", "app.py"]