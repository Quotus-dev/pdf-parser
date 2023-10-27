FROM node:18-alpine as BUILDER

WORKDIR /app

# Install Python and PyMuPDF
RUN apk add --update --no-cache python3 py3-pip
RUN apk add poppler-utils

# Install system dependencies
RUN apk add --update py-pip \
    && apk add --no-cache \
    python3-dev \
    mupdf-dev \
    gcc \
    libc-dev \
    musl-dev \
    jbig2dec \
    openjpeg-dev \
    jpeg-dev \
    harfbuzz-dev \
    && ln -s /usr/lib/libjbig2dec.so.0 /usr/lib/libjbig2dec.so \
    && apk add --no-cache make  # Install make \
    && apk add --no-cache g++    # Install g++

RUN apk --no-cache add build-base
# Install Python packages
RUN pip install PyMuPDF
RUN pip install pdf2image

# Copy and install Node.js application
COPY ["package.json", "package-lock.json", "./"]
RUN npm install
COPY . .

# Build the Node.js application
RUN npm run build

# Create a smaller final image
FROM node:18-alpine

WORKDIR /app

# Copy application artifacts from the builder stage
COPY --from=builder /app /app

CMD ["npm", "run", "dev"]