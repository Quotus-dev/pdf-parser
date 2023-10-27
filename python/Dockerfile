# Use an official Python runtime as the base image
FROM python:3.8

# Set the working directory in the container
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx

RUN apt-get update && apt-get install -y \
    tesseract-ocr
    
# Copy the requirements file into the container at /app
COPY requirements.txt /app/

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . /app/

# Make port 80 available to the world outside this container
# EXPOSE 80

# Define environment variable
ENV NAME World

# Run app.py when the container launches
# CMD ["python", "app.py"]
# CMD ["python", "-m", "cProfile", "app.py"]

# CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]

# ENV FLASK_ENV=development

# Conditionally run Gunicorn if FLASK_ENV is set to "production"
CMD ["sh", "-c", "[ \"$FLASK_ENV\" = 'production' ] && exec gunicorn -w 4 -b 0.0.0.0:5151 app:app || exec python -m flask run --host=0.0.0.0 --port=5151"]