FROM node:18-alpine

WORKDIR /app

# Install Python and PyMuPDF
RUN apk add --update --no-cache python3 py3-pip

# RUN apt-get update && apt-get install -y \
#     build-essential \
#     libxext-dev \
#     zlib1g-dev

# RUN apk update
# RUN apk add make
RUN apk add poppler-utils



RUN pip install pdf2image

# sudo apt-get update
# sudo apt-get install 


# COPY [, "./"]
COPY ["convert_to_images.py","package.json", "./"]
RUN npm install



COPY . .

CMD ["npm", "run", "dev"]