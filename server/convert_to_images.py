from pdf2image import convert_from_path
import os
import sys

args = sys.argv[1:]
if len(args) < 2:
    print('Usage: python convert_pdf_to_images.py input.pdf output_directory')
    sys.exit(1)

input_pdf = args[0]
output_directory = args[1]

images = convert_from_path(input_pdf)
 
for i in range(len(images)):
   
    image_filename = os.path.join(output_directory, f'page_{i + 1}.png')
    images[i].save(image_filename)