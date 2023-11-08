FROM node:18-alpine

WORKDIR /app

# RUN npm install -g pm2

# # Install Python and PyMuPDF
# RUN apk add --update --no-cache python3 py3-pip

# # RUN apt-get update && apt-get install -y \
# #     build-essential \
# #     libxext-dev \
# #     zlib1g-dev

# # RUN apk update
# # RUN apk add make
# RUN apk add poppler-utils

# # Install system dependencies
# RUN apk add --update py-pip \
#     && apk add --no-cache \
#     python3-dev \
#     mupdf-dev \
#     gcc \
#     libc-dev \
#     musl-dev \
#     jbig2dec \
#     openjpeg-dev \
#     jpeg-dev \
#     harfbuzz-dev \
#     && ln -s /usr/lib/libjbig2dec.so.0 /usr/lib/libjbig2dec.so \
#     && apk add --no-cache make  # Install make


# RUN apk add --no-cache g++    # Install g++
# RUN apk --no-cache add build-base
# # Install Python packages
# RUN pip install PyMuPDF


# # Install Python packages
# # RUN pip install pymupdf

# RUN pip install pdf2image

# sudo apt-get update
# sudo apt-get install 


# COPY [, "./"]
COPY ["package.json", "./"]
RUN npm install



COPY . .

CMD ["npm", "run", "dev"]